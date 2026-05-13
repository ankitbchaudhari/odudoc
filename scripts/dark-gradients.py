import pathlib, re, glob

files = []
for pat in ['app/**/page.tsx', 'app/**/layout.tsx']:
    for p in glob.glob('E:/odudoc/' + pat, recursive=True):
        norm = p.replace(chr(92), '/')
        if '/admin/' in norm:
            continue
        files.append(p)

REPLACEMENTS = [
    (re.compile(r'(bg-gradient-to-(?:br|r|b|tr|bl|tl|t|l) from-[a-z-]+50 via-white to-[a-z-]+50)(?! dark:)'),
     r'\1 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900'),
    (re.compile(r'(bg-gradient-to-(?:br|r|b|tr|bl|tl|t|l) from-[a-z-]+50 via-[a-z-]+50 to-[a-z-]+50)(?! dark:)'),
     r'\1 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900'),
    (re.compile(r'(bg-gradient-to-(?:br|r|b|tr|bl|tl|t|l) from-[a-z-]+50 to-[a-z-]+50)(?! dark:)'),
     r'\1 dark:from-slate-900 dark:to-slate-900'),
]

count = 0
for f in files:
    p = pathlib.Path(f)
    text = p.read_text(encoding='utf-8')
    orig = text
    for src, dst in REPLACEMENTS:
        text = src.sub(dst, text)
    if text != orig:
        p.write_text(text, encoding='utf-8')
        count += 1
        print(f'{f}: updated')
print(f'Total: {count} files')
