import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Container,
  SimpleGrid,
  Badge,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Textarea,
  Input,
  VStack,
  HStack,
  Text,
  Heading,
  Tag,
  TagCloseButton,
  Link,
  IconButton,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Select,
  InputGroup,
  InputLeftElement,
  Flex,
  Spacer
} from '@chakra-ui/react';

const API_BASE_URL = 'http://localhost:4001/api';

const getPlatformColor = (platform) => {
  switch ((platform || '').toLowerCase()) {
    case 'usaco':
      return 'purple';
    case 'cses':
      return 'blue';
    case 'cf':
      return 'red';
    default:
      return 'gray';
  }
};

const getResultColor = (result) => {
  if (!result) return 'gray';
  
  switch (result.toLowerCase()) {
    case 'accepted':
      return 'green';
    case 'tle':
    case 'time limit exceeded':
      return 'orange';
    default:
      return 'gray';
  }
};

const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const ProblemList = () => {
  const [problems, setProblems] = useState([]);
  const [filteredProblems, setFilteredProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterResult, setFilterResult] = useState('all');
  const [editingTags, setEditingTags] = useState([]);
  const [editingNotes, setEditingNotes] = useState('');
  const [newTag, setNewTag] = useState('');
  const [cardDensity, setCardDensity] = useState(() => {
    const saved = localStorage.getItem('ucc-card-density');
    return saved || 'normal';
  });
  const densitySettings = {
    compact: {
      columns: 5,
      padding: 4,
      spacing: 4
    },
    normal: {
      columns: 4,
      padding: 6,
      spacing: 5
    },
    spacious: {
      columns: 3,
      padding: 8,
      spacing: 6
    }
  };
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isCodeOpen, onOpen: onCodeOpen, onClose: onCodeClose } = useDisclosure();
  const [codeContent, setCodeContent] = useState('');
  const toast = useToast();

  useEffect(() => {
    fetchProblems();
  }, []);

  useEffect(() => {
    filterProblems();
  }, [problems, searchQuery, filterPlatform, filterResult]);

  const fetchProblems = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/problems`, {
        withCredentials: true
      });
      console.log('Fetched problems:', response.data);
      setProblems(response.data);
    } catch (error) {
      console.error('Error fetching problems:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch problems: ' + (error.response?.data?.error || error.message),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const filterProblems = () => {
    let filtered = [...problems];

    // Platform filter
    if (filterPlatform !== 'all') {
      filtered = filtered.filter(p => p.platform.toLowerCase() === filterPlatform.toLowerCase());
    }

    // Result filter
    if (filterResult !== 'all') {
      filtered = filtered.filter(p => {
        const status = p.name?.toLowerCase().startsWith('tle-') ? 'tle' : p.result?.toLowerCase();
        return status === filterResult.toLowerCase();
      });
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.problemId?.toLowerCase().includes(query) ||
        p.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredProblems(filtered);
  };

  const getFolderName = (problem) => {
    if (!problem) return '';
    
    switch (problem.platform.toLowerCase()) {
      case 'usaco':
        return problem.problemId;
      case 'cses':
        return `${problem.problemId}-${problem.name.toLowerCase().replace(/\s+/g, '-')}`;
      case 'cf':
        const match = problem.problemId.match(/(\d+)([A-Z])/);
        if (match) {
          return `${match[1]}-${match[2].toLowerCase()}-${problem.name.toLowerCase().replace(/\s+/g, '-')}`;
        }
        return problem.problemId;
      default:
        return problem.problemId;
    }
  };

  const getRawGitHubUrl = (problem) => {
    const repoOwner = 'ZigaoWang';
    const repoName = 'usaco-cses-cf';
    const folderName = getFolderName(problem);
    const filePath = `${problem.platform}/${folderName}/main.cpp`;
    return `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${filePath}`;
  };

  const getGitHubUrl = (problem) => {
    const repoOwner = 'ZigaoWang';
    const repoName = 'usaco-cses-cf';
    const folderName = getFolderName(problem);
    const filePath = `${problem.platform}/${folderName}/main.cpp`;
    return `https://github.com/${repoOwner}/${repoName}/blob/main/${filePath}`;
  };

  const handleViewProblem = async (problem) => {
    console.log('Selected problem:', problem);  // Debug log
    setSelectedProblem(problem);  // Store the whole problem object
    setEditingTags(problem.tags || []);
    setEditingNotes(problem.notes || '');
    
    try {
      // Fetch source code
      const rawUrl = getRawGitHubUrl(problem);
      const response = await axios.get(rawUrl);
      setCodeContent(response.data);
    } catch (error) {
      console.error('Error fetching source code:', error);
      setCodeContent('Failed to load source code. You can view the code on GitHub using the link below.');
    }
    
    onEditOpen();
  };

  const handleSaveChanges = async () => {
    if (!selectedProblem?.problemId) {
      toast({
        title: 'Error saving',
        description: 'Problem ID not found',
        status: 'error',
        duration: 2000,
      });
      return;
    }

    try {
      console.log('Saving problem:', {
        problemId: selectedProblem.problemId,
        tags: editingTags,
        notes: editingNotes
      });

      // Send only the updated fields
      const response = await axios.put(
        `${API_BASE_URL}/problems/${selectedProblem.problemId}`,
        {
          tags: editingTags,
          notes: editingNotes
        },
        {
          withCredentials: true
        }
      );

      // Update local state with the response data
      setProblems(prevProblems => 
        prevProblems.map(p => 
          p.problemId === selectedProblem.problemId ? response.data : p
        )
      );
      
      toast({
        title: 'Saved!',
        description: 'Changes saved successfully',
        status: 'success',
        duration: 2000,
      });
      
      onEditClose();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error saving',
        description: error.response?.data?.error || error.message,
        status: 'error',
        duration: 2000,
      });
    }
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !editingTags.includes(tag)) {
      setEditingTags(prev => [...prev, tag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setEditingTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  return (
    <Container maxW="container.xl">
      {/* Filters */}
      <VStack spacing={4} mb={8}>
        <Flex w="100%" gap={4} wrap="wrap">
          <InputGroup maxW="400px">
            <Input
              placeholder="🔍 Search by name, ID, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>

          <Select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            maxW="200px"
          >
            <option value="all">All Platforms</option>
            <option value="usaco">USACO</option>
            <option value="cses">CSES</option>
            <option value="cf">CodeForces</option>
          </Select>

          <Select
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
            maxW="200px"
          >
            <option value="all">All Results</option>
            <option value="accepted">Accepted</option>
            <option value="tle">Time Limit Exceeded</option>
          </Select>

          <Select
            value={cardDensity}
            onChange={(e) => {
              setCardDensity(e.target.value);
              localStorage.setItem('ucc-card-density', e.target.value);
            }}
            maxW="200px"
          >
            <option value="compact">Compact View</option>
            <option value="normal">Normal View</option>
            <option value="spacious">Spacious View</option>
          </Select>
        </Flex>

        <Text fontSize="sm" color="gray.600">
          Showing {filteredProblems.length} of {problems.length} problems
        </Text>
      </VStack>

      {/* Problem Grid */}
      <SimpleGrid 
        columns={{ base: 1, sm: 2, md: 3, lg: densitySettings[cardDensity].columns }} 
        spacing={densitySettings[cardDensity].spacing}
      >
        {filteredProblems.map((problem, index) => (
          <Box
            key={problem.problemId || index}
            bg="white"
            p={densitySettings[cardDensity].padding}
            borderRadius="xl"
            border="1px"
            borderColor="gray.100"
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'sm',
              borderColor: 'gray.200',
            }}
            transition="all 0.2s"
            cursor="pointer"
            onClick={() => handleViewProblem(problem)}
          >
            <VStack align="stretch" spacing={4}>
              <HStack spacing={densitySettings[cardDensity].spacing === 4 ? 1 : 3}>
                <Badge
                  colorScheme={getPlatformColor(problem.platform)}
                  variant="subtle"
                  px={densitySettings[cardDensity].spacing === 4 ? 2 : 3}
                  py={0.5}
                  borderRadius="md"
                  fontSize={densitySettings[cardDensity].spacing === 4 ? "xs" : "sm"}
                >
                  {problem.platform.toUpperCase()}
                </Badge>
                <Badge
                  colorScheme={getResultColor(problem.result)}
                  variant="outline"
                  px={densitySettings[cardDensity].spacing === 4 ? 2 : 3}
                  py={0.5}
                  borderRadius="md"
                  fontSize={densitySettings[cardDensity].spacing === 4 ? "xs" : "sm"}
                >
                  {problem.result === 'Time Limit Exceeded' ? 'TLE' : problem.result}
                </Badge>
              </HStack>
              
              <Box>
                <Text
                  fontSize="sm"
                  color="gray.500"
                  fontFamily="mono"
                  mb={2}
                >
                  {problem.problemId}
                </Text>
                <Heading size="md" color="gray.900">
                  {['cses', 'cf'].includes(problem.platform?.toLowerCase()) 
                    ? toTitleCase(problem.name)
                    : problem.name}
                </Heading>
              </Box>

              <Text
                fontSize="sm"
                color="gray.600"
                noOfLines={2}
              >
                {problem.notes || 'No notes added'}
              </Text>

              <HStack spacing={2} wrap="wrap">
                {problem.tags?.map((tag) => (
                  <Tag
                    key={tag}
                    size="sm"
                    variant="subtle"
                    colorScheme="gray"
                    borderRadius="full"
                  >
                    {tag}
                  </Tag>
                ))}
              </HStack>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>

      {/* Problem Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedProblem?.name}
            <Text fontSize="sm" color="gray.500" mt={1}>
              {selectedProblem?.platform} - {selectedProblem?.problemId}
            </Text>
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              {/* Source Code */}
              <Box>
                <Text mb={2} fontWeight="semibold">Source Code</Text>
                <Box
                  p={4}
                  bg="gray.50"
                  borderRadius="md"
                  fontFamily="mono"
                  fontSize="sm"
                  whiteSpace="pre-wrap"
                  overflowX="auto"
                  maxH="300px"
                  overflowY="auto"
                >
                  {codeContent || 'Loading source code...'}
                </Box>
              </Box>

              {/* Tags */}
              <Box>
                <Text mb={2} fontWeight="semibold">Tags</Text>
                <Flex wrap="wrap" gap={2} mb={2}>
                  {editingTags.map((tag, index) => (
                    <Tag 
                      key={index}
                      colorScheme="blue"
                      size="md"
                    >
                      {tag}
                      <TagCloseButton onClick={() => handleRemoveTag(tag)} />
                    </Tag>
                  ))}
                </Flex>
                <HStack>
                  <Input
                    placeholder="Add a tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button onClick={handleAddTag}>Add</Button>
                </HStack>
              </Box>

              {/* Notes */}
              <Box>
                <Text mb={2} fontWeight="semibold">Notes</Text>
                <Textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Add notes here..."
                  rows={6}
                />
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleSaveChanges}>
              Save
            </Button>
            <Button onClick={onEditClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default ProblemList;
