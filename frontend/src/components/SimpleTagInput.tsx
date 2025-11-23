// Backward compatibility wrapper for UnifiedTagInput
import UnifiedTagInput from './UnifiedTagInput';

interface SimpleTagInputProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function SimpleTagInput({ selectedTags, onTagsChange }: SimpleTagInputProps) {
  return (
    <UnifiedTagInput
      mode="deferred"
      selectedTagNames={selectedTags}
      onTagNamesChange={onTagsChange}
      showLabel={false}
      placeholder="Type to add tags"
      className="text-xs"
    />
  );
}
