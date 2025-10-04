// Simple time formatting utility

export function formatTimeLimit(timeLimit: string): string {
  if (!timeLimit || !timeLimit.trim()) {
    return 'No time limit';
  }

  const input = timeLimit.trim();
  
  // Try to parse as date first
  const date = new Date(input);
  if (!isNaN(date.getTime())) {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) {
      return `Expired ${formatRelativeTime(Math.abs(diff))} ago`;
    } else {
      return `Due in ${formatRelativeTime(diff)}`;
    }
  }
  
  // If not a date, return as-is (user-friendly)
  return input;
}

function formatRelativeTime(milliseconds: number): string {
  const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
  const hours = Math.floor((milliseconds % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  return 'less than a minute';
}

export function getTimeLimitStatus(timeLimit: string): {
  status: 'valid' | 'expired' | 'none';
  color: string;
  icon: string;
} {
  if (!timeLimit || !timeLimit.trim()) {
    return {
      status: 'none',
      color: 'text-gray-500',
      icon: '∞'
    };
  }

  const date = new Date(timeLimit);
  if (!isNaN(date.getTime())) {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) {
      return {
        status: 'expired',
        color: 'text-red-600',
        icon: '⏰'
      };
    } else {
      return {
        status: 'valid',
        color: 'text-green-600',
        icon: '⏱️'
      };
    }
  }
  
  // If it's not a date, assume it's a relative time (like "24 hours")
  return {
    status: 'valid',
    color: 'text-blue-600',
    icon: '⏱️'
  };
}