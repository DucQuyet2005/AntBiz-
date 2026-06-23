const fs = require('fs');

// Read baseline file
const content = fs.readFileSync('scratch/AiCreatorView_AdminUI.tsx', 'utf8');

// We will define the exact strings as they are parsed in memory in merge.js
const target = `                    const previewTimestamp = postData.published_at || toDateInputValue(new Date());
                    const isCardSelected = selectedVariantId === v.id;
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

console.log('Target length in memory:', target.length);
const idx = content.indexOf(target);
console.log('Index found:', idx);

if (idx === -1) {
  console.log("Checking line-by-line mismatch:");
  const targetLines = target.split('\n');
  let currentSearch = '';
  for (let i = 0; i < targetLines.length; i++) {
    const nextSearch = currentSearch + (currentSearch ? '\n' : '') + targetLines[i];
    if (content.indexOf(nextSearch) === -1) {
      console.log('Failed at line:', i + 1);
      console.log('Target line:', JSON.stringify(targetLines[i]));
      const lastWorkingIdx = content.indexOf(currentSearch);
      if (lastWorkingIdx !== -1) {
        const searchLen = currentSearch.length;
        console.log('Next content in file:', JSON.stringify(content.substring(lastWorkingIdx + searchLen, lastWorkingIdx + searchLen + 150)));
      }
      break;
    }
    currentSearch = nextSearch;
  }
}
