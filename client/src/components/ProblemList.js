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

const API_BASE_URL = 'http://localhost:4001';

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
  const [editingTags, setEditingTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
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
      const response = await axios.get(`${API_BASE_URL}/api/problems`);
      setProblems(response.data);
    } catch (error) {
      console.error('Error fetching problems:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch problems',
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
    setSelectedProblem(problem);
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

  const handleAddTag = () => {
    if (newTag && !editingTags.includes(newTag)) {
      setEditingTags([...editingTags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setEditingTags(editingTags.filter(tag => tag !== tagToRemove));
  };

  const handleUpdateProblem = async () => {
    if (!selectedProblem?._id) return;
    
    try {
      await axios.put(`${API_BASE_URL}/api/problems/${selectedProblem._id}`, {
        ...selectedProblem,
        tags: editingTags,
        notes: editingNotes
      });
      
      fetchProblems();
      onEditClose();
      
      toast({
        title: 'Success',
        description: 'Problem updated successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating problem:', error);
      toast({
        title: 'Error',
        description: 'Failed to update problem',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDensityChange = (newDensity) => {
    setCardDensity(newDensity);
    localStorage.setItem('ucc-card-density', newDensity);
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
            onChange={(e) => handleDensityChange(e.target.value)}
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
        {filteredProblems.map((problem) => (
          <Box
            key={problem._id}
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
                  colorScheme={problem.result === 'Accepted' ? 'green' : 'orange'}
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
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="2xl">
        <ModalOverlay backdropFilter="blur(10px)" />
        <ModalContent bg="white">
          <ModalHeader borderBottom="1px" borderColor="gray.100" pb={4}>
            <VStack align="stretch" spacing={3}>
              <HStack spacing={3}>
                <Badge
                  colorScheme={getPlatformColor(selectedProblem?.platform)}
                  variant="subtle"
                  px={3}
                  py={1}
                  borderRadius="md"
                >
                  {selectedProblem?.platform.toUpperCase()}
                </Badge>
                <Badge
                  colorScheme={selectedProblem?.result === 'Accepted' ? 'green' : 'orange'}
                  variant="outline"
                  px={3}
                  py={1}
                  borderRadius="md"
                >
                  {selectedProblem?.result === 'Time Limit Exceeded' ? 'TLE' : selectedProblem?.result}
                </Badge>
              </HStack>
              <Box>
                <Text fontSize="sm" color="gray.500" fontFamily="mono">
                  {selectedProblem?.problemId}
                </Text>
                <Heading size="lg" color="gray.900">
                  {['cses', 'cf'].includes(selectedProblem?.platform?.toLowerCase())
                    ? toTitleCase(selectedProblem?.name)
                    : selectedProblem?.name}
                </Heading>
              </Box>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack align="stretch" spacing={6}>
              {/* Source Code */}
              <Box>
                <Text fontWeight="medium" color="gray.700" mb={2}>Source Code</Text>
                <Box
                  bg="gray.50"
                  p={4}
                  borderRadius="md"
                  fontFamily="mono"
                  fontSize="sm"
                  whiteSpace="pre-wrap"
                  overflowX="auto"
                  maxH="300px"
                  overflowY="auto"
                  border="1px"
                  borderColor="gray.100"
                >
                  {codeContent || 'Loading...'}
                </Box>
              </Box>

              {/* Tags */}
              <Box>
                <Text fontWeight="medium" color="gray.700" mb={2}>Tags</Text>
                <Input
                  placeholder="Add tags (comma separated)"
                  value={editingTags.join(', ')}
                  onChange={(e) => setEditingTags(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                  bg="white"
                />
              </Box>

              {/* Notes */}
              <Box>
                <Text fontWeight="medium" color="gray.700" mb={2}>Notes</Text>
                <Textarea
                  placeholder="Add notes about this problem"
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  minH="150px"
                  bg="white"
                />
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter borderTop="1px" borderColor="gray.100" gap={3}>
            <Button variant="ghost" onClick={onEditClose}>Cancel</Button>
            <Button
              colorScheme="gray"
              onClick={handleUpdateProblem}
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default ProblemList;
