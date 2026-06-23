const fs = require('fs');

// Read the clean base file from AdminUI branch
let content = fs.readFileSync('scratch/AiCreatorView_AdminUI.tsx', 'utf8');

// 1. Update imports
const targetImport = "import PromptSuggestionSection from '../PromptSuggestionSection';\nimport PopupDialog, { PopupType } from '@/components/PopupDialog';";
const mergedImport = "import { useRouter } from 'next/navigation';\nimport { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges';\nimport PromptSuggestionSection from '../PromptSuggestionSection';\nimport CaptionEditor from '../CaptionEditor';\nimport PopupDialog, { PopupType } from '@/components/PopupDialog';";

content = content.replace(targetImport, mergedImport);

// 2. Update lucide-react imports for RotateCcw
content = content.replace("  Wand2\n} from 'lucide-react';", "  Wand2,\n  RotateCcw\n} from 'lucide-react';");

// 3. Update SocialVariant interface
const targetInterface = `interface SocialVariant {
  id: string; // A, B, C...
  facebook: string;
  threads: string;
  instagram: string;
  title: string;
  author: string;
  tags: string;
  captionId?: string;
}`;

const mergedInterface = `interface SocialVariant {
  id: string; // A, B, C...
  facebook: string;
  threads: string;
  instagram: string;
  originalFacebook?: string;
  originalThreads?: string;
  originalInstagram?: string;
  facebookCaptionId?: string;
  threadsCaptionId?: string;
  instagramCaptionId?: string;
  title: string;
  author: string;
  tags: string;
  captionId?: string;
}`;

content = content.replace(targetInterface, mergedInterface);

// 4. Update createEmptyVariant helper
const targetEmptyVariant = `const createEmptyVariant = (id: string): SocialVariant => ({
  id,
  facebook: '',
  threads: '',
  instagram: '',
  title: '',
  author: '',
  tags: '',
});`;

const mergedEmptyVariant = `const createEmptyVariant = (id: string): SocialVariant => ({
  id,
  facebook: '',
  threads: '',
  instagram: '',
  originalFacebook: '',
  originalThreads: '',
  originalInstagram: '',
  facebookCaptionId: '',
  threadsCaptionId: '',
  instagramCaptionId: '',
  title: '',
  author: '',
  tags: '',
});`;

content = content.replace(targetEmptyVariant, mergedEmptyVariant);

// 5. Update EditableText component helper to use module-level variables
const targetEditableTextHelperStart = `// Module-level variables to share state/handlers with EditableText without unmounting it
// (none in ours initially, or just create it before EditableTextContext)`;

const targetEditableTextContext = `interface EditableTextContextProps {
  editState: { variantId: string; field: string } | null;
  setEditState: (state: { variantId: string; field: keyof SocialVariant } | null) => void;
  handleUpdateVariantField: (variantId: string, field: keyof SocialVariant, value: string) => void;
}

const EditableTextContext = React.createContext<EditableTextContextProps | null>(null);

const EditableText = ({
  variantId,
  field,
  value,
  textarea = false,
  className = ""
}: {
  variantId: string;
  field: keyof SocialVariant;
  value: string;
  textarea?: boolean;
  className?: string;
}) => {
  const context = React.useContext(EditableTextContext);
  if (!context) return null;

  const { editState, setEditState, handleUpdateVariantField } = context;`;

const mergedEditableTextContext = `// Module-level variables to share state/handlers with EditableText without unmounting it
let _editState: any = null;
let _setEditState: any = () => {};
let _handleUpdateVariantField: any = () => {};
let _isGeneratingAB: boolean = false;

interface EditableTextContextProps {
  editState: { variantId: string; field: string } | null;
  setEditState: (state: { variantId: string; field: keyof SocialVariant } | null) => void;
  handleUpdateVariantField: (variantId: string, field: keyof SocialVariant, value: string) => void;
  isGeneratingAB?: boolean;
}

const EditableTextContext = React.createContext<EditableTextContextProps | null>(null);

const EditableText = ({
  variantId,
  field,
  value,
  textarea = false,
  className = ""
}: {
  variantId: string;
  field: keyof SocialVariant;
  value: string;
  textarea?: boolean;
  className?: string;
}) => {
  const context = React.useContext(EditableTextContext);
  const editState = context?.editState ?? _editState;
  const setEditState = context?.setEditState ?? _setEditState;
  const handleUpdateVariantField = context?.handleUpdateVariantField ?? _handleUpdateVariantField;
  const isGeneratingAB = context?.isGeneratingAB ?? _isGeneratingAB;`;

content = content.replace(targetEditableTextContext, mergedEditableTextContext);

// 6. Inject Router, Unsaved Changes states, history, auto-save states, and useUnsavedChanges hook
const targetStatesStart = `export default function AiCreatorView() {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [popup, setPopup] = useState<{ isOpen: boolean; message: string; type: PopupType } | null>(null);

  const showPopup = (message: string, type: PopupType = 'info') => {
    setPopup({ isOpen: true, message, type });
  };
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');`;

const mergedStatesStart = `export default function AiCreatorView() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [popup, setPopup] = useState<{ isOpen: boolean; message: string; type: PopupType } | null>(null);

  const showPopup = (message: string, type: PopupType = 'info') => {
    setPopup({ isOpen: true, message, type });
  };
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');

  // State for Social Media Variants (A/B Test copies)
  const [variants, setVariants] = useState<SocialVariant[]>([
    createEmptyVariant('A'),
    createEmptyVariant('B'),
  ]);

  // Track unsaved changes (T-1.13.5)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTabSwitch, setPendingTabSwitch] = useState<'editor' | 'generator' | null>(null);

  // Undo history state (T-1.13.5)
  const [savedHistory, setSavedHistory] = useState<SocialVariant[][]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Use unsaved changes warning hook
  useUnsavedChanges(
    hasUnsavedChanges,
    language === 'vi'
      ? 'Bạn có thay đổi chưa được lưu. Nếu rời khỏi trang, dữ liệu sẽ bị mất. Bạn có muốn tiếp tục?'
      : 'You have unsaved changes. If you leave this page, your data will be lost. Do you want to continue?'
  );`;

content = content.replace(targetStatesStart, mergedStatesStart);

// 7. Remove original variants declaration and inject inline edit state without references Sync (we sync later)
const targetSyncHook = `  // State for Social Media Variants (A/B Test copies)
  const [variants, setVariants] = useState<SocialVariant[]>([
    createEmptyVariant('A'),
    createEmptyVariant('B'),
  ]);

  // Inline Editing Active States
  const [editState, setEditState] = useState<{ variantId: string; field: string } | null>(null);`;

const mergedSyncHook = `  // Inline Editing Active States
  const [editState, setEditState] = useState<{ variantId: string; field: string } | null>(null);`;

content = content.replace(targetSyncHook, mergedSyncHook);

// 8. Replace handleProceedToABTest and streamVariant functions with updated logic that sets original values & savedHistory
const oldProceedToABTestBlock = `  const handleProceedToABTest = async () => {
    if (!activePrompt) {
      alert(language === 'vi' ? 'Vui lòng cấu hình prompt trước khi sinh bài viết.' : 'Please configure a prompt before generating.');
      return;
    }

    if (!url.trim() && !articleId) {
      alert(language === 'vi' ? 'Vui lòng cào/nhập bài viết trước khi sinh nội dung.' : 'Please crawl or import an article before generating.');
      return;
    }

    setIsGeneratingAB(true);
    const tagsStr = postData.tags.split(',').map((t: string) => '#' + t.trim().replace('#', '')).join(' ');

    // T-1.18: Build N variants (A, B, C) based on variantCount
    const variantIds = ['A', 'B', 'C'].slice(0, variantCount);
    const newVariants: SocialVariant[] = variantIds.map((id) => ({
      id,
      facebook: '',
      threads: '',
      instagram: '',
      title: postData.title,
      author: postData.author,
      tags: tagsStr,
    }));

    setVariants(newVariants);
    setStep(2);

    // T-1.18: Generate a new variantGroupId for this batch
    const newGroupId = crypto.randomUUID();
    setVariantGroupId(newGroupId);

    abortControllerRef.current = new AbortController();

    // T-1.18: Build prompt for each variant index to maximize diversity
    const buildVariantPrompt = (index: number, basePrompt: string): string => {
      if (index === 0) return basePrompt; // Variant A: prompt gốc
      if (index === 1) {
        // Variant B: Thân thiện, có emoji, câu hỏi gợi mở
        return \`\${basePrompt}\\n\\nLưu ý cho biến thể này: Hãy viết theo phong cách cực kỳ thân thiện, sử dụng emoji phù hợp, đặt câu hỏi gợi mở ở cuối bài để kích thích thảo luận và tương tác. Mở đầu bằng một câu ấn tượng tạo sự tò mò. CTA rõ ràng ở cuối.\`;
      }
      // Variant C: Ngắn gọn, facts-driven, không emoji
      return \`\${basePrompt}\\n\\nLưu ý cho biến thể này: Hãy viết ngắn gọn, súc tích, tập trung vào dữ liệu và sự kiện quan trọng. Không sử dụng emoji. Phong cách báo chí chuyên nghiệp, đúng trọng tâm. Hashtag ngắn gọn, hiệu quả.\`;
    };

    const streamVariant = async (variantId: string, variantIndex: number, groupId: string) => {
      const abortSignal = abortControllerRef.current?.signal;
      const customPromptText = buildVariantPrompt(variantIndex, activePrompt);
      try {
        const res = await fetch('/api/captions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url.trim() || undefined,
            articleId: articleId || undefined,
            customPrompt: customPromptText,
            platform: selectedPlatform,
            variantGroupId: groupId,
            variantIndex,
            ...(variantIndex === 0 && selectedPrompt?.id && !String(selectedPrompt.id).startsWith('custom-')
              ? { promptId: selectedPrompt.id }
              : {}),
          }),
          signal: abortSignal,
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(errJson?.error || \`HTTP \${res.status}\`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        if (!reader) throw new Error('No response body');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  accumulated += parsed.text;
                  setVariants((prev) =>
                    prev.map((v) =>
                      v.id === variantId
                        ? {
                            ...v,
                            [selectedPlatform]: accumulated,
                          }
                        : v
                    )
                  );
                }
                if (parsed.done && parsed.captionId) {
                  const newCaptionId = parsed.captionId;
                  setVariants((prev) =>
                    prev.map((v) =>
                      v.id === variantId ? { ...v, captionId: newCaptionId } : v
                    )
                  );
                }
                if (parsed.done && parsed.articleId && !articleId) {
                  setArticleId(parsed.articleId);
                }
              } catch (e) {
                // Ignore partial line JSON errors
              }
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error(\`Error streaming variant \${variantId}:\`, err);
        setVariants((prev) =>
          prev.map((v) =>
            v.id === variantId
              ? {
                  ...v,
                  [selectedPlatform]:
                    language === 'vi'
                      ? 'Lỗi khi sinh nội dung AI cho phiên bản này.'
                      : 'Error generating AI content for this variant.',
                }
              : v
          )
        );
      }
    };

    try {
      // T-1.18: Stream all N variants in parallel
      await Promise.all(
        variantIds.map((id, index) => streamVariant(id, index, newGroupId))
      );
    } catch (error) {
      console.error('Error generating variants:', error);
    } finally {
      setIsGeneratingAB(false);
    }
  };`;

const newProceedToABTestBlock = `  const handleProceedToABTest = async () => {
    if (!activePrompt) {
      alert(language === 'vi' ? 'Vui lòng cấu hình prompt trước khi sinh bài viết.' : 'Please configure a prompt before generating.');
      return;
    }

    if (!url.trim() && !articleId) {
      alert(language === 'vi' ? 'Vui lòng cào/nhập bài viết trước khi sinh nội dung.' : 'Please crawl or import an article before generating.');
      return;
    }

    setIsGeneratingAB(true);
    const tagsStr = postData.tags.split(',').map((t: string) => '#' + t.trim().replace('#', '')).join(' ');

    // T-1.18: Build N variants (A, B, C) based on variantCount
    const variantIds = ['A', 'B', 'C'].slice(0, variantCount);
    const newVariants: SocialVariant[] = variantIds.map((id) => ({
      id,
      facebook: '',
      threads: '',
      instagram: '',
      originalFacebook: '',
      originalThreads: '',
      originalInstagram: '',
      facebookCaptionId: '',
      threadsCaptionId: '',
      instagramCaptionId: '',
      title: postData.title,
      author: postData.author,
      tags: tagsStr,
    }));

    setVariants(newVariants);
    setStep(2);

    // T-1.18: Generate a new variantGroupId for this batch
    const newGroupId = crypto.randomUUID();
    setVariantGroupId(newGroupId);

    abortControllerRef.current = new AbortController();

    // T-1.18: Build prompt for each variant index to maximize diversity
    const buildVariantPrompt = (index: number, basePrompt: string): string => {
      if (index === 0) return basePrompt; // Variant A: prompt gốc
      if (index === 1) {
        // Variant B: Thân thiện, có emoji, câu hỏi gợi mở
        return \`\${basePrompt}\\n\\nLưu ý cho biến thể này: Hãy viết theo phong cách cực kỳ thân thiện, sử dụng emoji phù hợp, đặt câu hỏi gợi mở ở cuối bài để kích thích thảo luận và tương tác. Mở đầu bằng một câu ấn tượng tạo sự tò mò. CTA rõ ràng ở cuối.\`;
      }
      // Variant C: Ngắn gọn, facts-driven, không emoji
      return \`\${basePrompt}\\n\\nLưu ý cho biến thể này: Hãy viết ngắn gọn, súc tích, tập trung vào dữ liệu và sự kiện quan trọng. Không sử dụng emoji. Phong cách báo chí chuyên nghiệp, đúng trọng tâm. Hashtag ngắn gọn, hiệu quả.\`;
    };

    const streamVariant = async (variantId: string, variantIndex: number, groupId: string) => {
      const abortSignal = abortControllerRef.current?.signal;
      const customPromptText = buildVariantPrompt(variantIndex, activePrompt);
      try {
        const res = await fetch('/api/captions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url.trim() || undefined,
            articleId: articleId || undefined,
            customPrompt: customPromptText,
            platform: selectedPlatform,
            variantGroupId: groupId,
            variantIndex,
            ...(variantIndex === 0 && selectedPrompt?.id && !String(selectedPrompt.id).startsWith('custom-')
              ? { promptId: selectedPrompt.id }
              : {}),
          }),
          signal: abortSignal,
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(errJson?.error || \`HTTP \${res.status}\`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        if (!reader) throw new Error('No response body');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  accumulated += parsed.text;
                  setVariants((prev) =>
                    prev.map((v) =>
                      v.id === variantId
                        ? {
                            ...v,
                            [selectedPlatform]: accumulated,
                          }
                        : v
                    )
                  );
                }
                if (parsed.done && parsed.captionId) {
                  const newCaptionId = parsed.captionId;
                  const platKey = selectedPlatform === 'facebook' ? 'facebookCaptionId' :
                    selectedPlatform === 'threads' ? 'threadsCaptionId' :
                      'instagramCaptionId';
                  const originalField = selectedPlatform === 'facebook' ? 'originalFacebook' :
                    selectedPlatform === 'threads' ? 'originalThreads' :
                      'originalInstagram';

                  setVariants((prev) =>
                    prev.map((v) =>
                      v.id === variantId
                        ? {
                            ...v,
                            captionId: newCaptionId,
                            [platKey]: newCaptionId,
                            [originalField]: accumulated
                          }
                        : v
                    )
                  );
                }
                if (parsed.done && parsed.articleId && !articleId) {
                  setArticleId(parsed.articleId);
                }
              } catch (e) {
                // Ignore partial line JSON errors
              }
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error(\`Error streaming variant \${variantId}:\`, err);
        setVariants((prev) =>
          prev.map((v) =>
            v.id === variantId
              ? {
                  ...v,
                  [selectedPlatform]:
                    language === 'vi'
                      ? 'Lỗi khi sinh nội dung AI cho phiên bản này.'
                      : 'Error generating AI content for this variant.',
                }
              : v
          )
        );
      }
    };

    try {
      // T-1.18: Stream all N variants in parallel
      await Promise.all(
        variantIds.map((id, index) => streamVariant(id, index, newGroupId))
      );
      // Save history snapshot after parallel variant generation
      setVariants(currentVariants => {
        setSavedHistory([JSON.parse(JSON.stringify(currentVariants))]);
        return currentVariants;
      });
    } catch (error) {
      console.error('Error generating variants:', error);
    } finally {
      setIsGeneratingAB(false);
    }
  };`;

content = content.replace(oldProceedToABTestBlock, newProceedToABTestBlock);

// 9. Update handleRegenerateVariant to set original* values, platform-specific caption ID, and save history snapshot
const oldRegenerateVariantBlock = `  // T-1.18: Regenerate a single variant without resetting the others
  const handleRegenerateVariant = async (variantId: string) => {
    if (!activePrompt || (!url.trim() && !articleId)) return;
    const variantIndex = ['A', 'B', 'C'].indexOf(variantId);
    if (variantIndex === -1) return;

    setRegeneratingVariantId(variantId);

    // Clear the current content for this variant
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, [selectedPlatform]: '', captionId: undefined } : v))
    );

    const buildVariantPrompt = (index: number, basePrompt: string): string => {
      if (index === 0) return basePrompt;
      if (index === 1) {
        return \`\${basePrompt}\\n\\nLưu ý cho biến thể này: Hãy viết theo phong cách cực kỳ thân thiện, sử dụng emoji phù hợp, đặt câu hỏi gợi mở ở cuối bài để kích thích thảo luận và tương tác.\`;
      }
      return \`\${basePrompt}\\n\\nLưu ý cho biến thể này: Hãy viết ngắn gọn, súc tích, facts-driven, không emoji, phong cách báo chí chuyên nghiệp.\`;
    };

    const groupId = variantGroupId || crypto.randomUUID();
    if (!variantGroupId) setVariantGroupId(groupId);

    const customPromptText = buildVariantPrompt(variantIndex, activePrompt);

    try {
      const res = await fetch('/api/captions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim() || undefined,
          articleId: articleId || undefined,
          customPrompt: customPromptText,
          platform: selectedPlatform,
          variantGroupId: groupId,
          variantIndex,
          ...(variantIndex === 0 && selectedPrompt?.id && !String(selectedPrompt.id).startsWith('custom-')
            ? { promptId: selectedPrompt.id }
            : {}),
        }),
      });

      if (!res.ok) return;

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              accumulated += parsed.text;
              setVariants((prev) =>
                prev.map((v) =>
                  v.id === variantId ? { ...v, [selectedPlatform]: accumulated } : v
                )
              );
            }
            if (parsed.done && parsed.captionId) {
              const newCaptionId = parsed.captionId;
              setVariants((prev) =>
                prev.map((v) =>
                  v.id === variantId ? { ...v, captionId: newCaptionId } : v
                )
              );
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.error('Error regenerating variant:', err);
    } finally {
      setRegeneratingVariantId(null);
    }
  };`;

const newRegenerateVariantBlock = `  // T-1.18: Regenerate a single variant without resetting the others
  const handleRegenerateVariant = async (variantId: string) => {
    if (!activePrompt || (!url.trim() && !articleId)) return;
    const variantIndex = ['A', 'B', 'C'].indexOf(variantId);
    if (variantIndex === -1) return;

    setRegeneratingVariantId(variantId);

    // Clear the current content for this variant
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, [selectedPlatform]: '', captionId: undefined } : v))
    );

    const buildVariantPrompt = (index: number, basePrompt: string): string => {
      if (index === 0) return basePrompt;
      if (index === 1) {
        return \`\${basePrompt}\\n\\nLưu ý cho biến thể này: Hãy viết theo phong cách cực kỳ thân thiện, sử dụng emoji phù hợp, đặt câu hỏi gợi mở ở cuối bài để kích thích thảo luận và tương tác.\`;
      }
      return \`\${basePrompt}\\n\\nLưu ý cho biến thể này: Hãy viết ngắn gọn, súc tích, facts-driven, không emoji, phong cách báo chí chuyên nghiệp.\`;
    };

    const groupId = variantGroupId || crypto.randomUUID();
    if (!variantGroupId) setVariantGroupId(groupId);

    const customPromptText = buildVariantPrompt(variantIndex, activePrompt);

    try {
      const res = await fetch('/api/captions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim() || undefined,
          articleId: articleId || undefined,
          customPrompt: customPromptText,
          platform: selectedPlatform,
          variantGroupId: groupId,
          variantIndex,
          ...(variantIndex === 0 && selectedPrompt?.id && !String(selectedPrompt.id).startsWith('custom-')
            ? { promptId: selectedPrompt.id }
            : {}),
        }),
      });

      if (!res.ok) return;

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              accumulated += parsed.text;
              setVariants((prev) =>
                prev.map((v) =>
                  v.id === variantId ? { ...v, [selectedPlatform]: accumulated } : v
                )
              );
            }
            if (parsed.done && parsed.captionId) {
              const newCaptionId = parsed.captionId;
              const platKey = selectedPlatform === 'facebook' ? 'facebookCaptionId' :
                selectedPlatform === 'threads' ? 'threadsCaptionId' :
                  'instagramCaptionId';
              const originalField = selectedPlatform === 'facebook' ? 'originalFacebook' :
                selectedPlatform === 'threads' ? 'originalThreads' :
                  'originalInstagram';

              setVariants((prev) => {
                const updated = prev.map((v) =>
                  v.id === variantId
                    ? {
                        ...v,
                        captionId: newCaptionId,
                        [platKey]: newCaptionId,
                        [originalField]: accumulated
                      }
                    : v
                );
                setSavedHistory((h) => [...h, JSON.parse(JSON.stringify(updated))]);
                return updated;
              });
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.error('Error regenerating variant:', err);
    } finally {
      setRegeneratingVariantId(null);
    }
  };`;

content = content.replace(oldRegenerateVariantBlock, newRegenerateVariantBlock);

// 10. Inject Revert/Undo Ctrl+Z helper functions and debounced Auto-save logic
const oldUseEffectsSection = `  // Fetch prompts on mount
  useEffect(() => {
    setPromptsLoading(true);
    fetch('/api/prompts?pageSize=50')
      .then((r) => r.json())
      .then((json) => {
        if (json?.data) setPrompts(json.data);
      })
      .catch(() => { })
      .finally(() => setPromptsLoading(false));
  }, []);`;

const newUseEffectsSection = `  // Fetch prompts on mount
  useEffect(() => {
    setPromptsLoading(true);
    fetch('/api/prompts?pageSize=50')
      .then((r) => r.json())
      .then((json) => {
        if (json?.data) setPrompts(json.data);
      })
      .catch(() => { })
      .finally(() => setPromptsLoading(false));
  }, []);

  // Prevent leaving the page with unsaved changes (T-1.13.5)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedChanges = variants.some(v => {
        return (v.facebook && v.facebook !== v.originalFacebook) ||
          (v.threads && v.threads !== v.originalThreads) ||
          (v.instagram && v.instagram !== v.originalInstagram);
      });
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [variants]);

  // Auto-save debounced logic – 3 seconds after user stops typing (T-1.13.5)
  useEffect(() => {
    if (step !== 2) return;

    const timer = setTimeout(async () => {
      const modifiedVariants = variants.filter(v => {
        const fbChanged = !!(v.originalFacebook) && v.facebook !== v.originalFacebook;
        const trChanged = !!(v.originalThreads) && v.threads !== v.originalThreads;
        const igChanged = !!(v.originalInstagram) && v.instagram !== v.originalInstagram;
        return fbChanged || trChanged || igChanged;
      });

      if (modifiedVariants.length === 0) return;

      setAutoSaveStatus('saving');
      try {
        const resolvedArticleId = articleId || await ensureArticleForCaption();

        for (const v of modifiedVariants) {
          const platformsToSave: ('facebook' | 'threads' | 'instagram')[] = [];
          if (v.originalFacebook && v.facebook !== v.originalFacebook) platformsToSave.push('facebook');
          if (v.originalThreads && v.threads !== v.originalThreads) platformsToSave.push('threads');
          if (v.originalInstagram && v.instagram !== v.originalInstagram) platformsToSave.push('instagram');

          for (const plat of platformsToSave) {
            const content = v[plat];
            const platKey = plat === 'facebook' ? 'facebookCaptionId' :
              plat === 'threads' ? 'threadsCaptionId' :
                'instagramCaptionId';
            const dbCaptionId = v[platKey] || captionId;

            const res = await fetch('/api/captions/versions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                article_id: resolvedArticleId,
                platform: toDatabasePlatform(plat),
                content: content,
                source: 'human',
                caption_id: dbCaptionId || null
              }),
            });

            if (res.ok) {
              const data = await res.json();
              if (data?.data?.caption_id) {
                setVariants(prev => prev.map(item => item.id === v.id ? { ...item, [platKey]: data.data.caption_id } : item));
              }
            }
          }
        }
        setAutoSaveStatus('saved');
        setSavedHistory(prev => {
          const currentStr = JSON.stringify(variants);
          const lastHistory = prev[prev.length - 1];
          const lastStr = lastHistory ? JSON.stringify(lastHistory) : '';
          if (currentStr !== lastStr) {
            return [...prev, JSON.parse(currentStr)];
          }
          return prev;
        });
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } catch (err) {
        console.error('Auto-save error:', err);
        setAutoSaveStatus('error');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [variants, step]);

  const handleRevertToSaved = () => {
    if (savedHistory.length === 0) return;

    const currentStr = JSON.stringify(variants);
    const latestSavedStr = JSON.stringify(savedHistory[savedHistory.length - 1]);

    if (currentStr !== latestSavedStr) {
      setVariants(JSON.parse(latestSavedStr));
    } else if (savedHistory.length > 1) {
      const newHistory = [...savedHistory];
      newHistory.pop();
      const previousSaved = newHistory[newHistory.length - 1];
      setVariants(JSON.parse(JSON.stringify(previousSaved)));
      setSavedHistory(newHistory);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (step === 2) {
          e.preventDefault();
          handleRevertToSaved();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [savedHistory, step, variants]);`;

content = content.replace(oldUseEffectsSection, newUseEffectsSection);

// 11. Update ensureCaptionDraft to support platformSpecific caption ID fallbacks
const oldEnsureCaptionDraftBlock = `  const ensureCaptionDraft = async () => {
    const selectedVariant = variants.find((v) => v.id === selectedVariantId);
    if (!selectedVariant) {
      throw new Error(
        language === 'vi'
          ? 'Vui lòng chọn biến thể trước khi lên lịch.'
          : 'Please select a variant before scheduling.'
      );
    }

    const finalCompiledContent = compileFinalMessage(selectedVariant);
    const activeCaptionId = selectedVariant.captionId || (selectedVariant.id === 'A' ? captionId : undefined);

    if (activeCaptionId) {
      // Cập nhật nội dung hoàn chỉnh của caption đã sinh trước đó để phản ánh tùy chỉnh hiển thị
      const res = await fetch(\`/api/captions/\${activeCaptionId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edited_content: finalCompiledContent,
          status: 'draft',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Không thể cập nhật caption nháp.');
      }

      // Đảm bảo lưu captionId vào variant nếu nó chưa có
      if (!selectedVariant.captionId) {
        setVariants((prev) =>
          prev.map((v) => (v.id === selectedVariant.id ? { ...v, captionId: activeCaptionId } : v))
        );
      }
      return activeCaptionId;
    }

    const getSelectedVariantCaption = () => {
      if (selectedPlatform === 'facebook') return selectedVariant.facebook;
      if (selectedPlatform === 'threads') return selectedVariant.threads;
      if (selectedPlatform === 'instagram') return selectedVariant.instagram;
      return '';
    };

    const selectedContent = getSelectedVariantCaption();
    if (!selectedContent) {
      throw new Error(
        language === 'vi'
          ? 'Vui lòng chọn biến thể có nội dung trước khi lên lịch.'
          : 'Please select a variant with content before scheduling.'
      );
    }

    const resolvedArticleId = await ensureArticleForCaption();
    const res = await fetch('/api/captions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article_id: resolvedArticleId,
        platform: toDatabasePlatform(selectedPlatform),
        ai_content: selectedContent,
        edited_content: finalCompiledContent,
        ...(selectedPrompt?.id && !String(selectedPrompt.id).startsWith('custom-')
          ? { prompt_id: selectedPrompt.id }
          : {}),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.data?.id) {
      throw new Error(
        data?.error ||
        (language === 'vi'
          ? 'Không thể lưu caption nháp trước khi lên lịch.'
          : 'Could not save a draft caption before scheduling.')
      );
    }

    const newCaptionId = data.data.id;
    setCaptionId(newCaptionId);
    setVariants((prev) =>
      prev.map((v) => (v.id === selectedVariant.id ? { ...v, captionId: newCaptionId } : v))
    );
    return newCaptionId as string;
  };`;

const newEnsureCaptionDraftBlock = `  const ensureCaptionDraft = async () => {
    const selectedVariant = variants.find((v) => v.id === selectedVariantId);
    if (!selectedVariant) {
      throw new Error(
        language === 'vi'
          ? 'Vui lòng chọn biến thể trước khi lên lịch.'
          : 'Please select a variant before scheduling.'
      );
    }

    const finalCompiledContent = compileFinalMessage(selectedVariant);
    
    const platKey = selectedPlatform === 'facebook' ? 'facebookCaptionId' :
      selectedPlatform === 'threads' ? 'threadsCaptionId' :
        'instagramCaptionId';
    
    // Platform-specific caption ID fallback
    const activeCaptionId = selectedVariant[platKey] || selectedVariant.captionId || (selectedVariant.id === 'A' ? captionId : undefined);

    if (activeCaptionId) {
      // Cập nhật nội dung hoàn chỉnh của caption đã sinh trước đó để phản ánh tùy chỉnh hiển thị
      const res = await fetch(\`/api/captions/\${activeCaptionId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edited_content: finalCompiledContent,
          status: 'draft',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Không thể cập nhật caption nháp.');
      }

      // Đảm bảo lưu captionId vào variant nếu nó chưa có
      if (!selectedVariant.captionId || !selectedVariant[platKey]) {
        setVariants((prev) =>
          prev.map((v) => (v.id === selectedVariant.id ? { ...v, captionId: activeCaptionId, [platKey]: activeCaptionId } : v))
        );
      }
      return activeCaptionId;
    }

    const getSelectedVariantCaption = () => {
      if (selectedPlatform === 'facebook') return selectedVariant.facebook;
      if (selectedPlatform === 'threads') return selectedVariant.threads;
      if (selectedPlatform === 'instagram') return selectedVariant.instagram;
      return '';
    };

    const selectedContent = getSelectedVariantCaption();
    if (!selectedContent) {
      throw new Error(
        language === 'vi'
          ? 'Vui lòng chọn biến thể có nội dung trước khi lên lịch.'
          : 'Please select a variant with content before scheduling.'
      );
    }

    const resolvedArticleId = await ensureArticleForCaption();
    const originalField = selectedPlatform === 'facebook' ? 'originalFacebook' :
      selectedPlatform === 'threads' ? 'originalThreads' :
        'originalInstagram';
    const originalAiText = selectedVariant[originalField] || selectedContent;

    const res = await fetch('/api/captions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article_id: resolvedArticleId,
        platform: toDatabasePlatform(selectedPlatform),
        ai_content: originalAiText,
        edited_content: finalCompiledContent,
        ...(selectedPrompt?.id && !String(selectedPrompt.id).startsWith('custom-')
          ? { prompt_id: selectedPrompt.id }
          : {}),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.data?.id) {
      throw new Error(
        data?.error ||
        (language === 'vi'
          ? 'Không thể lưu caption nháp trước khi lên lịch.'
          : 'Could not save a draft caption before scheduling.')
      );
    }

    const newCaptionId = data.data.id;
    setCaptionId(newCaptionId);
    setVariants((prev) =>
      prev.map((v) => (v.id === selectedVariant.id ? { ...v, captionId: newCaptionId, [platKey]: newCaptionId } : v))
    );
    return newCaptionId as string;
  };`;

content = content.replace(oldEnsureCaptionDraftBlock, newEnsureCaptionDraftBlock);

// 12. Update handleSaveCurrentPrompt, handleFetch, handleImportFromExplorer, handleUpdateVariantField, handleConfirmSchedule and prompt select in dialog to toggle hasUnsavedChanges
const targetSavePromptBlock = `  const handleSaveCurrentPrompt = async () => {
    if (!activePrompt) return;
    setIsSavingPrompt(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: \`AI Generated - \${new Date().toLocaleDateString()}\`,
          content: activePrompt,
          platform: selectedPlatform,
          tags: ['AI Generated', selectedPlatform]
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        // Refresh prompt list
        const listRes = await fetch('/api/prompts?pageSize=100');
        if (listRes.ok) {
          const json = await listRes.json();
          setPromptsList(json.data || []);
        }
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
    } finally {
      setIsSavingPrompt(false);
    }
  };`;

const mergedSavePromptBlock = `  const handleSaveCurrentPrompt = async () => {
    if (!activePrompt) return null;
    setIsSavingPrompt(true);
    setSaveSuccess(false);
    try {
      const finalTitle = customPromptTitle.trim() || \`AI Generated - \${new Date().toLocaleDateString('vi-VN')}\`;
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalTitle,
          content: activePrompt,
          platform: promptPlatform,
          tags: ['AI Generated', promptPlatform]
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setSaveSuccess(true);
        setHasUnsavedChanges(false);
        setTimeout(() => setSaveSuccess(false), 3000);
        // Refresh prompt list
        const listRes = await fetch('/api/prompts?pageSize=100');
        if (listRes.ok) {
          const listJson = await listRes.json();
          setPromptsList(listJson.data || []);
        }
        return json.data;
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
    } finally {
      setIsSavingPrompt(false);
    }
    return null;
  };`;

content = content.replace(targetSavePromptBlock, mergedSavePromptBlock);
content = content.replace("generateVariants(updatedPostData, selectedPrompt);\n          setIsFetching(false);\n          return;", "generateVariants(updatedPostData, selectedPrompt);\n          setIsFetching(false);\n          setHasUnsavedChanges(true);\n          return;");
content = content.replace("generateVariants(updatedPostData, selectedPrompt);\n          setIsExplorerOpen(false);\n        }", "generateVariants(updatedPostData, selectedPrompt);\n          setIsExplorerOpen(false);\n          setHasUnsavedChanges(true);\n        }");
const targetUpdateFieldBlock = `  // Update variant field state on inline edit
  const handleUpdateVariantField = (variantId: string, field: keyof SocialVariant, value: string) => {
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, [field]: value } : v));
  };`;

const mergedUpdateFieldBlock = `  // Update variant field state on inline edit
  const handleUpdateVariantField = (variantId: string, field: keyof SocialVariant, value: string) => {
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, [field]: value } : v));
    setHasUnsavedChanges(true);
  };

  // Sync state values to module-level refs for EditableText
  _editState = editState;
  _setEditState = setEditState;
  _handleUpdateVariantField = handleUpdateVariantField;
  _isGeneratingAB = isGeneratingAB;`;

content = content.replace(targetUpdateFieldBlock, mergedUpdateFieldBlock);
content = content.replace("setIsScheduled(true);", "setIsScheduled(true);\n      setHasUnsavedChanges(false);");
content = content.replace("onClick={() => {\n                          setSelectedPrompt(p);\n                        }}", "onClick={() => {\n                          setSelectedPrompt(p);\n                          setHasUnsavedChanges(true);\n                        }}");

// 13. Update Step 2 preview card variables and add "Về bản gốc" (Revert) button
const oldVariantBadgeSection = `                    const previewTimestamp = postData.published_at || toDateInputValue(new Date());
                    const isCardSelected = selectedVariantId === v.id;
                    return (
                      <motion.div
                        key={v.id}
                        layout
                              )}
                            </button>
                            <span className={\\\`text-xs font-black px-3 py-1 rounded-full border select-none transition-all \\\${isCardSelected ? 'bg-primary text-white border-primary' : 'bg-primary/10 text-primary border-primary/10'
                              }\\\`}>
                              {language === 'vi' ? 'Biến thể' : 'Variant'} {v.id}
                            </span>
                          </div>
                        </div>`;

const newVariantBadgeSection = `                    const previewTimestamp = postData.published_at || toDateInputValue(new Date());
                    const isCardSelected = selectedVariantId === v.id;
                    const originalField = selectedPlatform === 'facebook' ? 'originalFacebook' :
                      selectedPlatform === 'threads' ? 'originalThreads' :
                        'originalInstagram';
                    const currentVal = v[selectedPlatform] || '';
                    const originalVal = v[originalField] || '';
                    const hasChanged = !!(originalVal && currentVal !== originalVal);
                    return (
                      <motion.div
                        key={v.id}
                        layout
                        layoutId={\`variant-card-\${v.id}\`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={\`rounded-3xl p-5 flex flex-col gap-3 relative overflow-hidden cursor-pointer select-none transition-all duration-300 \${isCardSelected
                            ? 'bg-white border-2 border-primary ring-4 ring-primary/15 shadow-2xl shadow-primary/15 scale-[1.01]'
                            : 'bg-white border border-gray-200/80 hover:border-primary/30 hover:shadow-lg shadow-sm'
                          }\`}
                      >
                        {/* Variant Badge & Platform Header */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className={\`w-6 h-6 rounded-full \${iconBg} flex items-center justify-center text-white shadow-sm\`}>
                              {selectedPlatform === 'facebook' && <Facebook size={12} className="fill-white" />}
                              {selectedPlatform === 'threads' && <ThreadsIcon size={12} />}
                              {selectedPlatform === 'instagram' && <Instagram size={12} />}
                            </div>
                            <span className="text-xs font-extrabold text-text">{platformLabel}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {hasChanged && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const confirmMsg = language === 'vi'
                                    ? 'Bạn có chắc chắn muốn hủy các thay đổi và quay lại nội dung gốc do AI tạo ra?'
                                    : 'Are you sure you want to discard your edits and revert to the original AI content?';
                                  if (window.confirm(confirmMsg)) {
                                    handleUpdateVariantField(v.id, selectedPlatform, originalVal);
                                  }
                                }}
                                className="flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 px-2.5 py-1 rounded-xl transition-all cursor-pointer select-none"
                                title={language === 'vi' ? 'Hủy chỉnh sửa, khôi phục bản AI gốc' : 'Discard edits, revert to original AI'}
                              >
                                <RefreshCw size={10} />
                                {language === 'vi' ? 'Về bản gốc' : 'Revert'}
                              </button>
                            )}
                            {isCardSelected && (
                              <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center gap-1 text-[9px] text-white bg-primary font-black px-2 py-0.5 rounded-full"
                              >
                                <Check size={9} />
                                Đã chọn
                              </motion.span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRegenerateVariant(v.id);
                              }}
                              disabled={regeneratingVariantId === v.id}
                              className={\`p-1.5 rounded-full hover:bg-gray-100 border border-gray-200 transition-colors \${regeneratingVariantId === v.id ? 'opacity-50 pointer-events-none' : ''
                                }\`}
                              title={language === 'vi' ? 'Tạo lại biến thể này' : 'Regenerate this variant'}
                            >
                              {regeneratingVariantId === v.id ? (
                                <Loader2 size={13} className="animate-spin text-primary" />
                              ) : (
                                <RefreshCw size={13} className="text-gray-500" />
                              )}
                            </button>
                            <span className={\`text-xs font-black px-3 py-1 rounded-full border select-none transition-all \${isCardSelected ? 'bg-primary text-white border-primary' : 'bg-primary/10 text-primary border-primary/10'
                              }\`}>
                              {language === 'vi' ? 'Biến thể' : 'Variant'} {v.id}
                            </span>
                          </div>
                        </div>`;

content = content.replace(oldVariantBadgeSection, newVariantBadgeSection);

// 14. Inject autoSaveStatus toast render into component output at the beginning of top level div
const oldTopLayout = `  return (
    <EditableTextContext.Provider value={{ editState, setEditState, handleUpdateVariantField }}>
      <div className="flex flex-col gap-6 w-full font-sans">`;

const newTopLayout = `  return (
    <EditableTextContext.Provider value={{ editState, setEditState, handleUpdateVariantField }}>
      <div className="flex flex-col gap-6 w-full font-sans">
        {autoSaveStatus !== 'idle' && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 30, x: 0 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={\`fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-lg backdrop-blur-sm border \${
                autoSaveStatus === 'saving'
                  ? 'bg-amber-50/95 text-amber-700 border-amber-200 shadow-amber-100'
                  : autoSaveStatus === 'saved'
                    ? 'bg-emerald-50/95 text-emerald-700 border-emerald-200 shadow-emerald-100'
                    : 'bg-rose-50/95 text-rose-700 border-rose-200 shadow-rose-100'
              }\`}
            >
              {autoSaveStatus === 'saving' && (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {language === 'vi' ? 'Đang lưu tự động...' : 'Auto-saving...'}
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <Check size={14} />
                  {language === 'vi' ? 'Đã lưu tự động' : 'Auto-saved'}
                </>
              )}
              {autoSaveStatus === 'error' && (
                <>
                  <X size={14} />
                  {language === 'vi' ? 'Lỗi lưu tự động' : 'Auto-save error'}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}`

content = content.replace(oldTopLayout, newTopLayout);

// 14.5. Update generateVariants to initialize original* fields and savedHistory
const targetGenerateVariantsBlock = `  // Helper to generate new variants with prompt-platform filtering constraints
  // T-1.19.1: Tạo 2 bản A/B với 2 phong cách khác nhau từ cùng 1 prompt
  const generateVariants = (data: typeof postData, prompt: any) => {
    const targetPlatforms = getPromptTargetPlatforms(prompt);
    const tagsStr = data.tags.split(',').map((t: string) => '#' + t.trim().replace('#', '')).join(' ');

    const newVariants: SocialVariant[] = [
      {
        id: 'A',
        facebook: targetPlatforms.includes('facebook') ? generatePlatformContent('facebook', prompt, data, false) : "",
        threads: targetPlatforms.includes('threads') ? generatePlatformContent('threads', prompt, data, false) : "",
        instagram: targetPlatforms.includes('instagram') ? generatePlatformContent('instagram', prompt, data, false) : "",
        title: data.title,
        author: data.author,
        tags: tagsStr
      },
      {
        id: 'B',
        // Bản B sẽ có văn phong khác một chút (ví dụ: thêm câu hỏi gợi mở hoặc thay đổi cách tiếp cận)
        facebook: targetPlatforms.includes('facebook') ? generatePlatformContent('facebook', prompt, data, true) : "",
        threads: targetPlatforms.includes('threads') ? generatePlatformContent('threads', prompt, data, true) : "",
        instagram: targetPlatforms.includes('instagram') ? generatePlatformContent('instagram', prompt, data, true) : "",
        title: data.title,
        author: data.author,
        tags: tagsStr
      }
    ];

    setVariants(newVariants);

    // Auto-select the first available platform tab
    if (targetPlatforms.length > 0) {
      const currentSelected = selectedPlatform as any;
      if (!targetPlatforms.includes(currentSelected)) {
        setSelectedPlatform(targetPlatforms[0]);
      }
    }
  };`;

const mergedGenerateVariantsBlock = `  // Helper to generate new variants with prompt-platform filtering constraints
  // T-1.19.1: Tạo 2 bản A/B với 2 phong cách khác nhau từ cùng 1 prompt
  const generateVariants = (data: typeof postData, prompt: any) => {
    const targetPlatforms = getPromptTargetPlatforms(prompt);
    const tagsStr = data.tags.split(',').map((t: string) => '#' + t.trim().replace('#', '')).join(' ');

    const newVariants: SocialVariant[] = [
      {
        id: 'A',
        facebook: targetPlatforms.includes('facebook') ? generatePlatformContent('facebook', prompt, data, false) : "",
        threads: targetPlatforms.includes('threads') ? generatePlatformContent('threads', prompt, data, false) : "",
        instagram: targetPlatforms.includes('instagram') ? generatePlatformContent('instagram', prompt, data, false) : "",
        originalFacebook: targetPlatforms.includes('facebook') ? generatePlatformContent('facebook', prompt, data, false) : "",
        originalThreads: targetPlatforms.includes('threads') ? generatePlatformContent('threads', prompt, data, false) : "",
        originalInstagram: targetPlatforms.includes('instagram') ? generatePlatformContent('instagram', prompt, data, false) : "",
        title: data.title,
        author: data.author,
        tags: tagsStr
      },
      {
        id: 'B',
        // Bản B sẽ có văn phong khác một chút (ví dụ: thêm câu hỏi gợi mở hoặc thay đổi cách tiếp cận)
        facebook: targetPlatforms.includes('facebook') ? generatePlatformContent('facebook', prompt, data, true) : "",
        threads: targetPlatforms.includes('threads') ? generatePlatformContent('threads', prompt, data, true) : "",
        instagram: targetPlatforms.includes('instagram') ? generatePlatformContent('instagram', prompt, data, true) : "",
        originalFacebook: targetPlatforms.includes('facebook') ? generatePlatformContent('facebook', prompt, data, true) : "",
        originalThreads: targetPlatforms.includes('threads') ? generatePlatformContent('threads', prompt, data, true) : "",
        originalInstagram: targetPlatforms.includes('instagram') ? generatePlatformContent('instagram', prompt, data, true) : "",
        title: data.title,
        author: data.author,
        tags: tagsStr
      }
    ];

    setVariants(newVariants);
    setSavedHistory([JSON.parse(JSON.stringify(newVariants))]);

    // Auto-select the first available platform tab
    if (targetPlatforms.length > 0) {
      const currentSelected = selectedPlatform as any;
      if (!targetPlatforms.includes(currentSelected)) {
        setSelectedPlatform(targetPlatforms[0]);
      }
    }
  };`;

content = content.replace(targetGenerateVariantsBlock, mergedGenerateVariantsBlock);

// 14.6. Update Prompt dialog footer to show both "Chỉ sử dụng" and "Lưu & Sử dụng Prompt" buttons
const targetDialogFooter = `                  {activeAiTab === 'editor' ? (
                    <button type="button" onClick={() => {
                      if (!activePrompt) return;
                      const finalTitle = customPromptTitle.trim() || \`Custom Prompt \${new Date().toLocaleDateString('vi-VN')}\`;
                      const newPrompt = { id: selectedPrompt?.id || \`custom-\${Date.now()}\`, name: finalTitle, content: activePrompt, platform: promptPlatform };
                      setSelectedPrompt(newPrompt);
                      generateVariants(postData, newPrompt);
                      setIsAiPromptDialogOpen(false);
                    }} disabled={!activePrompt}
                      className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 transition-all cursor-pointer border-none">
                      Lưu &amp; Sử dụng Prompt
                    </button>
                  ) : (`;

const mergedDialogFooter = `                  {activeAiTab === 'editor' ? (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => {
                        if (!activePrompt) return;
                        const finalTitle = customPromptTitle.trim() || \`Custom Prompt \${new Date().toLocaleDateString('vi-VN')}\`;
                        const newPrompt = { id: selectedPrompt?.id || \`custom-\${Date.now()}\`, name: finalTitle, content: activePrompt, platform: promptPlatform };
                        setSelectedPrompt(newPrompt);
                        generateVariants(postData, newPrompt);
                        setIsAiPromptDialogOpen(false);
                      }} disabled={!activePrompt}
                        className="bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none">
                        Chỉ sử dụng
                      </button>

                      <button type="button" onClick={async () => {
                        if (!activePrompt) return;
                        const savedPrompt = await handleSaveCurrentPrompt();
                        const finalTitle = customPromptTitle.trim() || \`AI Generated - \${new Date().toLocaleDateString('vi-VN')}\`;
                        const newPrompt = savedPrompt || { id: selectedPrompt?.id || \`custom-\${Date.now()}\`, name: finalTitle, content: activePrompt, platform: promptPlatform };
                        setSelectedPrompt(newPrompt);
                        generateVariants(postData, newPrompt);
                        setIsAiPromptDialogOpen(false);
                      }} disabled={!activePrompt || isSavingPrompt}
                        className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 transition-all cursor-pointer border-none flex items-center gap-2">
                        {isSavingPrompt && <Loader2 size={14} className="animate-spin" />}
                        Lưu &amp; Sử dụng Prompt
                      </button>
                    </div>
                  ) : (`;

content = content.replace(targetDialogFooter, mergedDialogFooter);

// 14.7. Update module-level EditableText return block to support isGeneratingAB
const targetModuleEditableTextReturn = `  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setEditState({ variantId, field });
      }}
      className={\`group relative cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-all duration-200 border border-transparent hover:border-primary/10 \${className}\`}
    >
      <span className="whitespace-pre-wrap">
        {value ? (
          value
        ) : (
          <span className="text-gray-300 italic">Nhấp để chỉnh sửa...</span>
        )}
      </span>
      <span className="absolute right-1 top-1 opacity-0 group-hover:opacity-40 transition-opacity">
        <Edit2 size={10} className="text-primary" />
      </span>
    </div>
  );`;

const mergedModuleEditableTextReturn = `  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setEditState({ variantId, field });
      }}
      className={\`group relative cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-all duration-200 border border-transparent hover:border-primary/10 \${className}\`}
    >
      <span className="whitespace-pre-wrap">
        {value ? (
          value
        ) : isGeneratingAB ? (
          <span className="text-gray-400 italic flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin text-primary shrink-0" />
            {language === 'vi' ? 'AI đang viết...' : 'AI is writing...'}
          </span>
        ) : (
          <span className="text-gray-300 italic">Nhấp để chỉnh sửa...</span>
        )}
      </span>
      <span className="absolute right-1 top-1 opacity-0 group-hover:opacity-40 transition-opacity">
        <Edit2 size={10} className="text-primary" />
      </span>
    </div>
  );`;

content = content.replace(targetModuleEditableTextReturn, mergedModuleEditableTextReturn);

// 14.8. Delete nested EditableText component to prevent duplicate rendering and focus loss (T-1.13.5)
const nestedEditableTextStart = `  // Inline editable wrapper component that prevents layout shifts
  const EditableText = ({
    variantId,
    field,
    value,
    textarea = false,
    className = ""
  }: {
    variantId: string;
    field: keyof SocialVariant;
    value: string;
    textarea?: boolean;
    className?: string;
  }) => {
    const isEditing = editState?.variantId === variantId && editState?.field === field;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isEditing) {
        if (textarea && textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = \`\${textareaRef.current.scrollHeight}px\`;
        }
      }
    }, [isEditing, value, textarea]);

    if (isEditing) {
      return (
        <div className="w-full relative">
          {textarea ? (
            <textarea
              ref={textareaRef}
              autoFocus
              value={value}
              onChange={(e) => {
                handleUpdateVariantField(variantId, field, e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = \`\${e.target.scrollHeight}px\`;
              }}
              onBlur={() => setEditState(null)}
              className="w-full text-inherit bg-transparent p-0 border-0 outline-none resize-none focus:ring-0 focus:outline-none leading-relaxed transition-all"
            />
          ) : (
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={value}
              onChange={(e) => handleUpdateVariantField(variantId, field, e.target.value)}
              onBlur={() => setEditState(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditState(null);
              }}
              className="w-full text-inherit bg-transparent p-0 border-0 outline-none focus:ring-0 focus:outline-none font-inherit transition-all"
            />
          )}
        </div>
      );
    }

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setEditState({ variantId, field });
        }}
        className={\`group relative cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-all duration-200 border border-transparent hover:border-primary/10 \${className}\`}
      >
        <span className="whitespace-pre-wrap">
          {value ? (
            value
          ) : isGeneratingAB ? (
            <span className="text-gray-400 italic flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin text-primary shrink-0" />
              {language === 'vi' ? 'AI đang viết...' : 'AI is writing...'}
            </span>
          ) : (
            <span className="text-gray-300 italic">Nhấp để chỉnh sửa...</span>
          )}
        </span>
        <span className="absolute right-1 top-1 opacity-0 group-hover:opacity-40 transition-opacity">
          <Edit2 size={10} className="text-primary" />
        </span>
      </div>
    );
  };`;

content = content.replace(nestedEditableTextStart, "");

// 14.9. Update EditableTextContext.Provider in AiCreatorView return statement to pass isGeneratingAB
content = content.replace(
  "<EditableTextContext.Provider value={{ editState, setEditState, handleUpdateVariantField }}>",
  "<EditableTextContext.Provider value={{ editState, setEditState, handleUpdateVariantField, isGeneratingAB }}>"
);

// Write out the merged content
fs.writeFileSync('components/views/AiCreatorView.tsx', content, 'utf8');
console.log('AiCreatorView.tsx successfully merged!');
