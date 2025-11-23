// Backward compatibility wrapper for UnifiedTagInput
import UnifiedTagInput from './UnifiedTagInput';

interface TagInputProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
}

export default function TagInput({ selectedTagIds, onTagsChange }: TagInputProps) {
  return (
    <UnifiedTagInput
      mode="immediate"
      selectedTagIds={selectedTagIds}
      onTagIdsChange={onTagsChange}
      showLabel={true}
    />
  );
}
