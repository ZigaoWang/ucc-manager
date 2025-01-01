import React, { useState, useEffect, createContext, useContext } from 'react';
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
  Spacer,
  Wrap,
  WrapItem
} from '@chakra-ui/react';
import { ChevronDownIcon, SearchIcon } from '@chakra-ui/icons';
import StatusIndicator from './StatusIndicator';

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

const formatResult = (result) => {
  if (!result) return 'Unknown';
  if (result.toLowerCase() === 'time limit exceeded') return 'TLE';
  return result;
};

const formatProblemName = (name, platform) => {
  if (!name) return '';
  
  // Remove TLE prefix if present
  name = name.replace(/^tle-/i, '');
  
  // For CSES and Codeforces, use title case
  if (['cses', 'cf'].includes(platform?.toLowerCase())) {
    return name.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }
  
  // For other platforms (like USACO), keep original case
  return name;
};

// Create context
export const ProblemListContext = createContext(null);

// Create Provider component
export function ProblemListProvider({ children }) {
  const [lastFetched, setLastFetched] = useState(null);
  
  return (
    <ProblemListContext.Provider value={{ lastFetched, setLastFetched }}>
      {children}
    </ProblemListContext.Provider>
  );
}

// Create StatusIndicator component
export function ProblemListStatusIndicator() {
  const { lastFetched } = useContext(ProblemListContext);
  return <StatusIndicator lastFetched={lastFetched} />;
}

function ProblemList() {
  const [problems, setProblems] = useState([]);
  const [filteredProblems, setFilteredProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterResult, setFilterResult] = useState('all');
  const [filterTag, setFilterTag] = useState('');
  const [editingTags, setEditingTags] = useState([]);
  const [editingNotes, setEditingNotes] = useState('');
  const [newTag, setNewTag] = useState('');
  const [allTags, setAllTags] = useState([]);
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
  const { lastFetched, setLastFetched } = useContext(ProblemListContext);

  const fetchProblems = async () => {
    try {
      console.log('Fetching problems...');
      const response = await axios.get(`${API_BASE_URL}/problems`, {
        withCredentials: true
      });
      console.log('Fetched problems:', response.data);
      
      // Add error handling for response data
      if (!response.data || !Array.isArray(response.data.problems)) {
        console.error('Invalid response data:', response.data);
        throw new Error('Invalid response data from server');
      }
      
      setProblems(response.data.problems);
      setLastFetched(response.data.lastModified);
    } catch (error) {
      console.error('Error fetching problems:', error);
      setProblems([]); // Set empty array on error
      toast({
        title: 'Error',
        description: 'Failed to fetch problems: ' + (error.response?.data?.error || error.message),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchProblems();

    // Set up auto-refresh every 5 minutes (300,000 milliseconds)
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing problems...');
      fetchProblems();
    }, 5 * 60 * 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    filterProblems();
  }, [problems, searchQuery, filterPlatform, filterResult, filterTag]);

  useEffect(() => {
    const tags = new Set();
    problems.forEach(problem => {
      problem.tags?.forEach(tag => tags.add(tag));
    });
    setAllTags(Array.from(tags).sort());
  }, [problems]);

  const filterProblems = () => {
    let filtered = [...problems];

    if (filterPlatform !== 'all') {
      filtered = filtered.filter(p => p.platform.toLowerCase() === filterPlatform.toLowerCase());
    }

    if (filterResult !== 'all') {
      filtered = filtered.filter(p => {
        const status = p.name?.toLowerCase().startsWith('tle-') ? 'tle' : p.result?.toLowerCase();
        return status === filterResult.toLowerCase();
      });
    }

    if (filterTag) {
      filtered = filtered.filter(p => p.tags?.includes(filterTag));
    }

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.platform?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
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
    console.log('Selected problem:', problem);  
    setSelectedProblem(problem);  
    setEditingTags(problem.tags || []);
    setEditingNotes(problem.notes || '');
    
    try {
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

  const handleTagClick = (tag) => {
    setFilterTag(prevTag => prevTag === tag ? '' : tag);
  };

  const renderTags = (tags, showClose = false) => {
    if (!tags || tags.length === 0) return null;
    return (
      <HStack spacing={2} mt={2} wrap="wrap">
        {tags.map((tag, index) => (
          <Tag
            key={index}
            size="sm"
            variant={filterTag === tag ? "solid" : "subtle"}
            colorScheme="blue"
            cursor="pointer"
            onClick={() => handleTagClick(tag)}
          >
            {tag}
            {showClose && (
              <TagCloseButton
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTags(prev => prev.filter(t => t !== tag));
                }}
              />
            )}
          </Tag>
        ))}
      </HStack>
    );
  };

  const renderAllTags = () => {
    if (allTags.length === 0) return null;
    return (
      <Box mb={4}>
        <Text fontWeight="bold" mb={2}>Filter by Tag:</Text>
        <HStack spacing={2} wrap="wrap">
          {allTags.map(tag => (
            <Tag
              key={tag}
              size="md"
              variant={filterTag === tag ? "solid" : "subtle"}
              colorScheme="blue"
              cursor="pointer"
              onClick={() => handleTagClick(tag)}
            >
              {tag}
              <Badge ml={2} colorScheme="blue" variant={filterTag === tag ? "solid" : "outline"}>
                {problems.filter(p => p.tags?.includes(tag)).length}
              </Badge>
            </Tag>
          ))}
        </HStack>
      </Box>
    );
  };

  const renderProblemCard = (problem) => {
    const formattedName = formatProblemName(problem.name, problem.platform);
    const formattedResult = formatResult(problem.result);
    
    return (
      <Box
        key={problem.problemId}
        bg="white"
        p={densitySettings[cardDensity].padding}
        borderRadius="xl"
        boxShadow="sm"
        border="1px"
        borderColor="gray.100"
        onClick={() => handleViewProblem(problem)}
        cursor="pointer"
        _hover={{
          transform: 'translateY(-2px)',
          boxShadow: 'md',
          borderColor: 'blue.100'
        }}
        transition="all 0.2s"
      >
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <Badge
              colorScheme={getPlatformColor(problem.platform)}
              variant="subtle"
              px={3}
              py={1}
              borderRadius="md"
              fontSize="sm"
              textTransform="uppercase"
              fontWeight="bold"
            >
              {problem.platform.toUpperCase()}
            </Badge>
            <Badge
              colorScheme={getResultColor(problem.result)}
              variant={formattedResult === 'TLE' ? 'solid' : 'outline'}
              px={3}
              py={1}
              borderRadius="md"
              fontSize="sm"
            >
              {formattedResult}
            </Badge>
          </HStack>
          
          <VStack align="stretch" spacing={1}>
            <Text
              fontSize="xs"
              color="gray.500"
              fontFamily="mono"
            >
              #{problem.problemId}
            </Text>
            <Heading
              size="sm"
              noOfLines={2}
              color="gray.800"
            >
              {formattedName}
            </Heading>
          </VStack>

          {renderTags(problem.tags)}
          
          {problem.notes && (
            <Text
              fontSize="sm"
              color="gray.600"
              noOfLines={2}
              mt={1}
            >
              {problem.notes}
            </Text>
          )}
        </VStack>
      </Box>
    );
  };

  // Attach components to ProblemList
  ProblemList.Provider = ProblemListProvider;
  ProblemList.StatusIndicator = ProblemListStatusIndicator;

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
          <VStack spacing={6} align="stretch">
            <HStack justify="space-between">
              <Heading size="lg" color="gray.800">Problems</Heading>
              <Menu>
                <MenuButton as={Button} rightIcon={<ChevronDownIcon />} size="sm">
                  Density: {toTitleCase(cardDensity)}
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => {
                    setCardDensity('compact');
                    localStorage.setItem('ucc-card-density', 'compact');
                  }}>Compact</MenuItem>
                  <MenuItem onClick={() => {
                    setCardDensity('normal');
                    localStorage.setItem('ucc-card-density', 'normal');
                  }}>Normal</MenuItem>
                  <MenuItem onClick={() => {
                    setCardDensity('spacious');
                    localStorage.setItem('ucc-card-density', 'spacious');
                  }}>Spacious</MenuItem>
                </MenuList>
              </Menu>
            </HStack>

            <HStack spacing={4}>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search problems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  bg="gray.50"
                  _focus={{
                    bg: "white",
                    borderColor: "blue.400"
                  }}
                />
              </InputGroup>
              <Select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                w="200px"
                bg="gray.50"
              >
                <option value="all">All Platforms</option>
                <option value="usaco">USACO</option>
                <option value="cses">CSES</option>
                <option value="cf">Codeforces</option>
              </Select>
              <Select
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value)}
                w="200px"
                bg="gray.50"
              >
                <option value="all">All Results</option>
                <option value="accepted">Accepted</option>
                <option value="tle">TLE</option>
              </Select>
            </HStack>

            {allTags.length > 0 && (
              <Box>
                <Text fontWeight="medium" color="gray.600" mb={2}>Tags</Text>
                <Wrap spacing={2}>
                  {allTags.map(tag => (
                    <WrapItem key={tag}>
                      <Tag
                        size="md"
                        variant={filterTag === tag ? "solid" : "subtle"}
                        colorScheme="blue"
                        cursor="pointer"
                        onClick={() => handleTagClick(tag)}
                        _hover={{
                          transform: 'translateY(-1px)',
                          shadow: 'sm'
                        }}
                        transition="all 0.2s"
                      >
                        {tag}
                        <Badge
                          ml={2}
                          colorScheme="blue"
                          variant={filterTag === tag ? "solid" : "outline"}
                        >
                          {problems.filter(p => p.tags?.includes(tag)).length}
                        </Badge>
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              </Box>
            )}
            
            <Text fontSize="sm" color="gray.500">
              Showing {filteredProblems.length} of {problems.length} problems
            </Text>
          </VStack>
        </Box>

        <SimpleGrid
          columns={densitySettings[cardDensity].columns}
          spacing={densitySettings[cardDensity].spacing}
        >
          {filteredProblems.map(renderProblemCard)}
        </SimpleGrid>

        {/* Problem Modal */}
        <Modal isOpen={isEditOpen} onClose={onEditClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <VStack align="stretch" spacing={1}>
                <Text fontSize="sm" color="gray.500">
                  {selectedProblem?.platform?.toUpperCase()} #{selectedProblem?.problemId}
                </Text>
                <Heading size="lg">
                  {selectedProblem && formatProblemName(selectedProblem.name, selectedProblem.platform)}
                </Heading>
              </VStack>
            </ModalHeader>
            <ModalCloseButton />
            
            <ModalBody pb={6}>
              <VStack spacing={6} align="stretch">
                {/* Source Code */}
                <Box>
                  <Text fontWeight="medium" color="gray.700" mb={2}>Source Code</Text>
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
                    border="1px"
                    borderColor="gray.200"
                  >
                    {codeContent || 'Loading source code...'}
                  </Box>
                </Box>

                {/* Tags */}
                <Box>
                  <Text fontWeight="medium" color="gray.700" mb={2}>Tags</Text>
                  <VStack align="stretch" spacing={3}>
                    <Wrap spacing={2}>
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
                    </Wrap>
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
                      <Button colorScheme="blue" onClick={handleAddTag}>
                        Add
                      </Button>
                    </HStack>
                  </VStack>
                </Box>

                {/* Notes */}
                <Box>
                  <Text fontWeight="medium" color="gray.700" mb={2}>Notes</Text>
                  <Textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Add notes here..."
                    rows={6}
                    bg="gray.50"
                    _focus={{
                      bg: "white",
                      borderColor: "blue.400"
                    }}
                  />
                </Box>
              </VStack>
            </ModalBody>

            <ModalFooter bg="gray.50" borderBottomRadius="xl">
              <Button colorScheme="blue" mr={3} onClick={handleSaveChanges}>
                Save Changes
              </Button>
              <Button variant="ghost" onClick={onEditClose}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  );
}

export default ProblemList;
