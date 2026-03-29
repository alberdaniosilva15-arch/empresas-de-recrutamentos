import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from '../lib/dateUtils';

export const TimeAgo = ({ date }: { date: any }) => {
  const [timeAgo, setTimeAgo] = useState(formatDistanceToNow(date));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatDistanceToNow(date));
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [date]);

  return <span>{timeAgo}</span>;
};
