import React from 'react';
import {
  ChakraProvider,
  Container,
  VStack,
  Box,
  Heading,
  Text,
  Link,
  HStack,
  Center,
} from '@chakra-ui/react';
import ProblemList, { ProblemListProvider, ProblemListStatusIndicator } from './components/ProblemList';

function App() {
  return (
    <ChakraProvider>
      <ProblemListProvider>
        <Box minH="100vh" display="flex" flexDirection="column" bg="gray.50">
          {/* Header */}
          <Box 
            borderBottom="1px" 
            borderColor="gray.100" 
            bg="white" 
            py={4} 
            position="sticky" 
            top={0} 
            zIndex={1000}
            backdropFilter="blur(10px)"
            backgroundColor="rgba(255, 255, 255, 0.9)"
          >
            <Container maxW="container.xl">
              <HStack spacing={4} align="center" justify="space-between">
                <HStack spacing={4} align="baseline">
                  <Heading size="lg" color="gray.900">UCC Manager</Heading>
                  <Text fontSize="md" fontWeight="medium" color="gray.600" ml={1}>
                    <Text as="span" fontWeight="900" fontSize="1.2em" color="gray.900">U</Text>SACO · 
                    <Text as="span" fontWeight="900" fontSize="1.2em" color="gray.900">C</Text>SES · 
                    <Text as="span" fontWeight="900" fontSize="1.2em" color="gray.900">C</Text>odeForces
                  </Text>
                </HStack>
                <ProblemListStatusIndicator />
              </HStack>
            </Container>
          </Box>

          {/* Main Content */}
          <Box flex="1" py={8}>
            <Container maxW="container.xl">
              <ProblemList />
            </Container>
          </Box>

          {/* Footer */}
          <Box py={4} borderTop="1px" borderColor="gray.100" bg="white">
            <Container maxW="container.xl">
              <Center>
                <HStack spacing={2}>
                  <Text color="gray.600">Made by Zigao Wang</Text>
                  <Text color="gray.400">·</Text>
                  <Link
                    href="https://www.gnu.org/licenses/gpl-3.0.en.html"
                    color="gray.600"
                    _hover={{ color: "gray.900" }}
                    isExternal
                  >
                    GNU License
                  </Link>
                  <Text color="gray.400">·</Text>
                  <Link
                    href="https://github.com/ZigaoWang/ucc-manager"
                    color="gray.600"
                    _hover={{ color: "gray.900" }}
                    isExternal
                  >
                    View on GitHub
                  </Link>
                  <Text color="gray.400">·</Text>
                  <Text color="gray.400"> 2025</Text>
                </HStack>
              </Center>
            </Container>
          </Box>
        </Box>
      </ProblemListProvider>
    </ChakraProvider>
  );
}

export default App;
