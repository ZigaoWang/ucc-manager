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
  useToast,
  Wrap,
  WrapItem,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Select,
  InputGroup,
  InputLeftElement,
  IconButton,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import { ChevronDownIcon, SearchIcon } from '@chakra-ui/icons';
import StatusIndicator from './StatusIndicator';

// API configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // Empty string since we're serving from the same domain
  : 'http://localhost:4001';

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
export const ProblemListContext = createContext({
  lastFetched: null,
  setLastFetched: () => {}
});

// Create Provider component
export const ProblemListProvider = ({ children }) => {
  const [lastFetched, setLastFetched] = useState(null);
  return (
    <ProblemListContext.Provider value={{ lastFetched, setLastFetched }}>
      {children}
    </ProblemListContext.Provider>
  );
};

// Create StatusIndicator component
export const ProblemListStatusIndicator = () => {
  const { lastFetched } = useContext(ProblemListContext);
  return <StatusIndicator lastFetched={lastFetched} />;
};

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
  const [codeContent, setCodeContent] = useState('');
  const { lastFetched, setLastFetched } = useContext(ProblemListContext);
  
  const toast = useToast();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isCodeOpen, onOpen: onCodeOpen, onClose: onCodeClose } = useDisclosure();
  
  const [cardDensity, setCardDensity] = useState(() => {
    const saved = localStorage.getItem('ucc-card-density');
    return saved || 'normal';
  });

  const fetchProblems = async () => {
    try {
      console.log('Fetching problems...');
      const response = await axios.get(`${API_BASE_URL}/api/problems`);
      console.log('Response:', response.data);

      if (!response.data || !response.data.problems) {
        throw new Error('Invalid response format');
      }

      const { problems: fetchedProblems, lastModified } = response.data;
      
      if (!Array.isArray(fetchedProblems)) {
        throw new Error('Problems data is not an array');
      }

      setProblems(fetchedProblems);
      
      // Update tags
      const tags = new Set();
      fetchedProblems.forEach(problem => {
        if (Array.isArray(problem.tags)) {
          problem.tags.forEach(tag => tags.add(tag));
        }
      });
      setAllTags(Array.from(tags));
      
      // Update lastFetched with the server's lastModified time
      if (lastModified) {
        setLastFetched(lastModified);
      } else {
        setLastFetched(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error fetching problems:', error);
      toast({
        title: 'Error fetching problems',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchProblems();
  }, []);

  // Filter problems when dependencies change
  useEffect(() => {
    if (!Array.isArray(problems)) {
      console.error('Problems is not an array:', problems);
      return;
    }

    let filtered = [...problems];

    if (searchQuery) {
      filtered = filtered.filter(problem =>
        problem.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterPlatform !== 'all') {
      filtered = filtered.filter(problem => problem.platform === filterPlatform);
    }

    if (filterResult !== 'all') {
      filtered = filtered.filter(problem => problem.result === filterResult);
    }

    if (filterTag) {
      filtered = filtered.filter(problem =>
        problem.tags && problem.tags.includes(filterTag)
      );
    }

    setFilteredProblems(filtered);
  }, [problems, searchQuery, filterPlatform, filterResult, filterTag]);

  const handleCardClick = async (problem) => {
    console.log('Card clicked:', problem);
    setSelectedProblem(problem);
    setEditingTags(problem.tags || []);
    setEditingNotes(problem.notes || '');
    
    try {
      const rawUrl = getRawGitHubUrl(problem);
      console.log('Fetching code from:', rawUrl);
      const response = await axios.get(rawUrl);
      setCodeContent(response.data || '// No code content available');
    } catch (error) {
      console.error('Error fetching source code:', error);
      setCodeContent('// Failed to load source code. You can view the code on GitHub using the link below.');
    }
    
    onEditOpen();
  };

  const handleViewProblem = async (problem) => {
    try {
      const rawUrl = getRawGitHubUrl(problem);
      const response = await axios.get(rawUrl);
      const content = response.data;
      
      if (!content) {
        toast({
          title: 'Error',
          description: 'Failed to fetch source code',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      setCodeContent(content);
      onCodeOpen();
    } catch (error) {
      console.error('Error fetching source code:', error);
      setCodeContent('Failed to load source code. You can view the code on GitHub using the link below.');
      toast({
        title: 'Error',
        description: 'Failed to fetch source code: ' + error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      onCodeOpen();
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedProblem?.problemId) {
      toast({
        title: 'Error saving',
        description: 'Problem ID not found',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/api/problems/${selectedProblem.problemId}`,
        {
          ...selectedProblem,
          tags: editingTags,
          notes: editingNotes
        },
        { withCredentials: true }
      );
      
      // Update local state
      setProblems(prevProblems =>
        prevProblems.map(p =>
          p.problemId === selectedProblem.problemId
            ? { ...p, tags: editingTags, notes: editingNotes }
            : p
        )
      );
      
      toast({
        title: 'Saved!',
        description: 'Changes saved successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      
      onEditClose();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error saving',
        description: error.response?.data?.error || error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
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
        p={4}
        borderRadius="xl"
        boxShadow="sm"
        border="1px"
        borderColor="gray.100"
        onClick={() => handleCardClick(problem)}
        cursor="pointer"
        transition="all 0.2s"
        _hover={{
          transform: 'translateY(-2px)',
          boxShadow: 'md',
        }}
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
              variant={formattedResult === 'TLE' ? "solid" : "outline"}
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
                        <Badge ml={2} colorScheme="blue" variant={filterTag === tag ? "solid" : "outline"}>
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

        <SimpleGrid columns={densitySettings[cardDensity].columns} spacing={densitySettings[cardDensity].spacing}>
          {filteredProblems.map((problem) => (
            <Box
              key={problem.problemId}
              bg="white"
              p={4}
              borderRadius="xl"
              boxShadow="sm"
              border="1px"
              borderColor="gray.100"
              onClick={() => handleCardClick(problem)}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'md',
              }}
            >
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between">
                  <Badge
                    colorScheme={getPlatformColor(problem.platform)}
                    px={2}
                    py={1}
                    borderRadius="md"
                  >
                    {problem.platform}
                  </Badge>
                  <Badge
                    colorScheme={getResultColor(problem.result)}
                    variant={problem.result === 'TLE' ? "solid" : "outline"}
                    px={3}
                    py={1}
                    borderRadius="md"
                  >
                    {formatResult(problem.result)}
                  </Badge>
                </HStack>

                <Text
                  fontWeight="semibold"
                  fontSize="md"
                  noOfLines={2}
                  title={problem.name}
                >
                  {formatProblemName(problem.name, problem.platform)}
                </Text>

                <Wrap spacing={1}>
                  {(problem.tags || []).map((tag, index) => (
                    <WrapItem key={index}>
                      <Tag
                        size="sm"
                        colorScheme="blue"
                        variant="outline"
                        borderRadius="full"
                      >
                        {tag}
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>

                {problem.notes && (
                  <Text fontSize="sm" color="gray.600" noOfLines={2}>
                    {problem.notes}
                  </Text>
                )}
              </VStack>
            </Box>
          ))}
        </SimpleGrid>

        {/* Edit Modal */}
        <Modal isOpen={isEditOpen} onClose={onEditClose} size="xl">
          <ModalOverlay />
          <ModalContent maxW="90vw">
            <ModalHeader>
              {selectedProblem?.name}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                {/* Source Code Section */}
                <Box>
                  <Heading size="sm" mb={2}>Source Code</Heading>
                  <Box
                    bg="gray.50"
                    p={4}
                    borderRadius="md"
                    maxH="400px"
                    overflowY="auto"
                  >
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{codeContent}</pre>
                  </Box>
                  {selectedProblem && (
                    <Link
                      href={getGitHubUrl(selectedProblem)}
                      isExternal
                      color="blue.500"
                      mt={2}
                      display="block"
                    >
                      View on GitHub
                    </Link>
                  )}
                </Box>

                {/* Tags Section */}
                <Box>
                  <Heading size="sm" mb={2}>Tags</Heading>
                  <Wrap mb={2}>
                    {editingTags.map((tag, index) => (
                      <WrapItem key={index}>
                        <Tag
                          size="md"
                          borderRadius="full"
                          variant="solid"
                          colorScheme="blue"
                        >
                          {tag}
                          <TagCloseButton
                            onClick={() => {
                              setEditingTags(prev =>
                                prev.filter((_, i) => i !== index)
                              );
                            }}
                          />
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                  <Input
                    placeholder="Add new tag (press Enter)"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTag();
                      }
                    }}
                  />
                </Box>

                {/* Notes Section */}
                <Box>
                  <Heading size="sm" mb={2}>Notes</Heading>
                  <Textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Add your notes here..."
                    rows={4}
                  />
                </Box>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={handleSaveChanges}>
                Save Changes
              </Button>
              <Button onClick={onEditClose}>Cancel</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  );
}

export default ProblemList;
