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
      return 'orange';
    case 'cses':
      return 'purple';
    case 'codeforces':
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

const ProblemList = () => {
  const [problems, setProblems] = useState([]);
  const [filteredProblems, setFilteredProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterResult, setFilterResult] = useState('all');
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

  return (
    <Container maxW="container.xl" py={8}>
      {/* Filters */}
      <VStack spacing={4} mb={8}>
        <Flex w="100%" gap={4}>
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
        </Flex>
        <Text color="gray.500" alignSelf="flex-start">
          Showing {filteredProblems.length} of {problems.length} problems
        </Text>
      </VStack>

      {/* Problem Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {filteredProblems.map((problem) => {
          const resultColor = getResultColor(problem.result);
          const platformColor = getPlatformColor(problem.platform);
          const isTLE = problem.name?.toLowerCase().startsWith('tle-');

          return (
            <Box
              key={problem._id || Math.random()}
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              p={4}
              boxShadow="sm"
              bg="white"
              _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
              transition="all 0.2s"
              cursor="pointer"
              onClick={() => handleViewProblem(problem)}
            >
              <VStack align="stretch" spacing={4}>
                {/* Header */}
                <Box>
                  <HStack spacing={2} mb={2}>
                    <Badge colorScheme={platformColor}>{(problem.platform || 'Unknown').toUpperCase()}</Badge>
                    <Text fontWeight="bold">{problem.problemId || 'No ID'}</Text>
                    <Badge colorScheme={resultColor}>
                      {isTLE ? 'Time Limit Exceeded' : problem.result || 'Unknown'}
                    </Badge>
                  </HStack>
                  <Heading size="sm" noOfLines={2}>
                    {(problem.name || 'Untitled Problem').replace(/^tle-/i, '')}
                  </Heading>
                </Box>

                {/* Tags */}
                {problem.tags && problem.tags.length > 0 && (
                  <HStack spacing={2} wrap="wrap">
                    {problem.tags.map((tag, index) => (
                      <Tag key={index} size="sm" colorScheme="blue">
                        {tag}
                      </Tag>
                    ))}
                  </HStack>
                )}

                {/* Notes Preview */}
                {problem.notes && (
                  <Text fontSize="sm" color="gray.600" noOfLines={2}>
                    {problem.notes}
                  </Text>
                )}
              </VStack>
            </Box>
          );
        })}
      </SimpleGrid>

      {/* Problem Details Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={2}>
              <Badge colorScheme={getPlatformColor(selectedProblem?.platform)}>
                {(selectedProblem?.platform || 'Unknown').toUpperCase()}
              </Badge>
              <Text>{selectedProblem?.problemId || 'No ID'}</Text>
              <Badge colorScheme={getResultColor(selectedProblem?.result)}>
                {selectedProblem?.name?.toLowerCase().startsWith('tle-')
                  ? 'Time Limit Exceeded'
                  : selectedProblem?.result || 'Unknown'}
              </Badge>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">
              {/* Problem Name */}
              <Box>
                <Text fontWeight="bold" mb={2}>Problem Name:</Text>
                <Text fontSize="lg">
                  {(selectedProblem?.name || 'Untitled Problem').replace(/^tle-/i, '')}
                </Text>
              </Box>

              {/* Source Code */}
              <Box>
                <Text fontWeight="bold" mb={2}>Source Code:</Text>
                <Box
                  bg="gray.50"
                  p={4}
                  borderRadius="md"
                  fontFamily="monospace"
                  fontSize="sm"
                  whiteSpace="pre-wrap"
                  overflowX="auto"
                  maxH="300px"
                  overflowY="auto"
                  mb={2}
                >
                  {codeContent || 'Loading...'}
                </Box>
                <Link 
                  color="blue.500" 
                  href={selectedProblem && getGitHubUrl(selectedProblem)} 
                  isExternal
                >
                  View on GitHub
                </Link>
              </Box>

              {/* Tags */}
              <Box>
                <Text fontWeight="bold" mb={2}>Tags:</Text>
                <HStack spacing={2} mb={2} wrap="wrap">
                  {editingTags.map((tag, index) => (
                    <Tag key={index} size="md" colorScheme="blue">
                      {tag}
                      <Button
                        size="xs"
                        ml={1}
                        onClick={() => handleRemoveTag(tag)}
                        variant="ghost"
                      >
                        ×
                      </Button>
                    </Tag>
                  ))}
                </HStack>
                <HStack>
                  <Input
                    placeholder="Add new tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button onClick={handleAddTag}>Add</Button>
                </HStack>
              </Box>

              {/* Notes */}
              <Box>
                <Text fontWeight="bold" mb={2}>Notes:</Text>
                <Textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Add notes about the problem..."
                  rows={4}
                />
              </Box>

              {/* Save Button */}
              <Button colorScheme="blue" onClick={handleUpdateProblem}>
                Save Changes
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default ProblemList;
