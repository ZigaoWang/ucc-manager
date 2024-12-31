import React from 'react';
import { ChakraProvider, Box, Container, Heading, Text, VStack, Link } from '@chakra-ui/react';
import ProblemList from './components/ProblemList';

function App() {
  return (
    <ChakraProvider>
      <Box minH="100vh" display="flex" flexDirection="column">
        {/* Header */}
        <Box bg="blue.500" color="white" py={4} mb={8}>
          <Container maxW="container.xl">
            <Heading size="lg">UCC Manager</Heading>
          </Container>
        </Box>

        {/* Main Content */}
        <Box flex="1">
          <ProblemList />
        </Box>

        {/* Footer */}
        <Box bg="gray.100" py={4} mt={8}>
          <Container maxW="container.xl">
            <VStack spacing={2} align="center">
              <Text>Made by Zigao Wang</Text>
              <Text fontSize="sm" color="gray.600">
                Licensed under the{' '}
                <Link
                  href="https://www.gnu.org/licenses/gpl-3.0.en.html"
                  color="blue.500"
                  isExternal
                >
                  GNU General Public License v3.0
                </Link>
              </Text>
            </VStack>
          </Container>
        </Box>
      </Box>
    </ChakraProvider>
  );
}

export default App;
