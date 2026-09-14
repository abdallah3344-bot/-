/**
 * يبني ملف .docx صغيرًا فيه حقول دمج — لاختبار مسار تعبئة قوالب Word.
 * التشغيل:  node scripts/e2e/fixtures/make-docx.mjs <المسار>
 */
import PizZip from 'pizzip'
import { writeFileSync } from 'node:fs'

const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
<w:p><w:r><w:t xml:space="preserve">محكمة {{case.court}} الموقّرة</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">المدعي: {{client.name}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">المدعى عليه: {{opponent.name}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">الموضوع: {{case.title}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">الأهلية: {{client.legal_capacity}}</w:t></w:r></w:p>
</w:body></w:document>`

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

const zip = new PizZip()
zip.file('[Content_Types].xml', contentTypes)
zip.folder('_rels').file('.rels', rels)
zip.folder('word').file('document.xml', doc)
writeFileSync(process.argv[2], zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }))
console.log('written', process.argv[2])
