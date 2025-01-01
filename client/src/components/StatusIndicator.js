import React, { useState, useEffect } from 'react';
import { HStack, Box, Text, Tooltip } from '@chakra-ui/react';

const StatusIndicator = ({ lastFetched }) => {
  const [timeDisplay, setTimeDisplay] = useState('');
  const [exactTimeDisplay, setExactTimeDisplay] = useState('');

  const getStatusColor = () => {
    if (!lastFetched) return 'red.500';
    
    const now = new Date();
    const fetchTime = new Date(lastFetched);
    const diffMinutes = (now - fetchTime) / (1000 * 60);
    
    if (diffMinutes <= 5) return 'green.500';
    if (diffMinutes <= 15) return 'yellow.500';
    return 'red.500';
  };

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const updateTimeDisplay = () => {
    if (!lastFetched) {
      setTimeDisplay('Not updated');
      setExactTimeDisplay('Never updated');
      return;
    }

    const fetchTime = new Date(lastFetched);
    const now = new Date();
    const diffMinutes = Math.floor((now - fetchTime) / (1000 * 60));
    
    if (diffMinutes < 60) {
      setTimeDisplay(`${diffMinutes}m ago`);
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      setTimeDisplay(`${hours}h ${minutes}m ago`);
    }
    
    setExactTimeDisplay(`Last updated: ${formatDateTime(lastFetched)}`);
  };

  useEffect(() => {
    // Update immediately when lastFetched changes
    updateTimeDisplay();
    
    // Update every 30 seconds
    const intervalId = setInterval(updateTimeDisplay, 30 * 1000);
    
    return () => clearInterval(intervalId);
  }, [lastFetched]);

  return (
    <Tooltip label={exactTimeDisplay} placement="bottom">
      <HStack spacing={2} align="center">
        <Box
          w="10px"
          h="10px"
          borderRadius="full"
          bg={getStatusColor()}
        />
        <Text fontSize="sm" color="gray.600">
          {timeDisplay}
        </Text>
      </HStack>
    </Tooltip>
  );
};

export default StatusIndicator;
