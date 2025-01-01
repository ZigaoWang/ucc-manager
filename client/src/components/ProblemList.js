import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import {
  Box,
  Container,
  SimpleGrid,
  Badge,
  Input,
  VStack,
  HStack,
  Text,
  Heading,
  Link,
  useToast,
  Select,
  InputGroup,
  InputLeftElement,
  Flex,
  Spacer,
  Divider,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import StatusIndicator from './StatusIndicator';

// API configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' 
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

const formatResult = (result) => {
  if (!result) return 'Unknown';
  if (result.toLowerCase() === 'time limit exceeded') return 'TLE';
  return result;
};

// Create context for last fetch time
export const ProblemListContext = createContext({
  lastFetched: null,
  setLastFetched: () => {},
});

export const ProblemListProvider = ({ children }) => {
  const [lastFetched, setLastFetched] = useState(null);
  return (
    <ProblemListContext.Provider value={{ lastFetched, setLastFetched }}>
      {children}
    </ProblemListContext.Provider>
  );
};

export const ProblemListStatusIndicator = () => {
  const { lastFetched } = useContext(ProblemListContext);
  return <StatusIndicator lastUpdated={lastFetched} />;
};

const ProblemList = () => {
  const [problems, setProblems] = useState([]);
  const [filteredProblems, setFilteredProblems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const { setLastFetched } = useContext(ProblemListContext);
  const toast = useToast();

  const fetchProblems = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/problems`);
      // Check if response.data is an array, if not, look for it in a property
      const problemsData = Array.isArray(response.data) ? response.data : 
                         response.data.problems || [];
      setProblems(problemsData);
      setLastFetched(new Date().toISOString());
    } catch (error) {
      console.error('Error fetching problems:', error);
      setProblems([]); // Set empty array on error
      toast({
        title: 'Error fetching problems',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    fetchProblems();
    const interval = setInterval(fetchProblems, 5 * 60 * 1000); // Fetch every 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!Array.isArray(problems)) {
      setFilteredProblems([]);
      return;
    }

    let filtered = [...problems];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(problem =>
        problem.problemId?.toLowerCase().includes(query) ||
        problem.name?.toLowerCase().includes(query)
      );
    }

    if (platformFilter !== 'all') {
      filtered = filtered.filter(problem =>
        problem.platform?.toLowerCase() === platformFilter.toLowerCase()
      );
    }

    if (resultFilter !== 'all') {
      filtered = filtered.filter(problem =>
        problem.result?.toLowerCase() === resultFilter.toLowerCase()
      );
    }

    setFilteredProblems(filtered);
  }, [problems, searchQuery, platformFilter, resultFilter]);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg" mb={4}>Problem List</Heading>
        
        <HStack spacing={4}>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          
          <Select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            w="200px"
          >
            <option value="all">All Platforms</option>
            <option value="usaco">USACO</option>
            <option value="cses">CSES</option>
            <option value="cf">Codeforces</option>
          </Select>
          
          <Select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            w="200px"
          >
            <option value="all">All Results</option>
            <option value="accepted">Accepted</option>
            <option value="time limit exceeded">TLE</option>
          </Select>
        </HStack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {filteredProblems.map((problem) => (
            <Box
              key={`${problem.platform}-${problem.problemId}`}
              bg="white"
              p={4}
              borderRadius="lg"
              boxShadow="sm"
              border="1px"
              borderColor="gray.200"
            >
              <VStack spacing={3} align="stretch">
                <Flex align="center">
                  <Badge colorScheme={getPlatformColor(problem.platform)}>
                    {problem.platform.toUpperCase()}
                  </Badge>
                  <Spacer />
                  <Badge colorScheme={getResultColor(problem.result)}>
                    {formatResult(problem.result)}
                  </Badge>
                </Flex>
                
                <Heading size="md">
                  {problem.problemId}
                </Heading>
                
                <Text>{problem.name}</Text>
                
                <Divider />
                
                <Link
                  href={problem.sourceFile}
                  isExternal
                  color="blue.500"
                  fontWeight="medium"
                >
                  View Solution
                </Link>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      </VStack>
    </Container>
  );
};

export default ProblemList;
