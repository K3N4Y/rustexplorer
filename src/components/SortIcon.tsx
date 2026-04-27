import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

import type { SortOption, SortOrder } from '../types/pane';

interface SortIconProps {
  option: SortOption;
  sortBy: SortOption;
  sortOrder: SortOrder;
  isSearchActive: boolean;
}

const SortIcon: React.FC<SortIconProps> = ({ option, sortBy, sortOrder, isSearchActive }) => {
  if (isSearchActive) return null;
  if (sortBy !== option) return null;
  return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />;
};

export default React.memo(SortIcon);
