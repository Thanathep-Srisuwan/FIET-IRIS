const ROOT_ATTR = 'data-i18n-dom-ready'

const SKIP_SELECTOR = [
  'script',
  'style',
  'noscript',
  'code',
  'pre',
  'textarea',
  '[contenteditable="true"]',
  '.ql-editor',
].join(',')

const textOriginals = new WeakMap()
const attrOriginals = new WeakMap()

const phraseMap = new Map(
  Object.entries({
    'หน้าแรก': 'Home',
    'ฟีเจอร์': 'Features',
    'ระบบที่เกี่ยวข้อง': 'Related systems',
    'ข่าวสาร': 'News',
    'ข่าวสารและประกาศ': 'News and announcements',
    'ติดต่อเรา': 'Contact us',
    'เข้าสู่ระบบ': 'Sign in',
    'ออกจากระบบ': 'Log out',
    'เมนูหลัก': 'Main menu',
    'เปิดเมนูหลัก': 'Open main menu',
    'ปิดเมนูหลัก': 'Close main menu',
    'ปิดหน้าต่าง': 'Close window',
    'ดูรายละเอียดเพิ่มเติม': 'View more details',
    'อ่านเพิ่มเติม': 'Read more',
    'คลิกเพื่ออ่านเพิ่มเติม': 'Click to read more',
    'กำลังโหลดข้อมูล...': 'Loading data...',
    'กำลังโหลดรายละเอียด...': 'Loading details...',
    'กำลังโหลด...': 'Loading...',
    'ยังไม่มีข้อมูล': 'No data yet',
    'ไม่มีข้อมูลในกลุ่มนี้': 'No data in this group',
    'ยังไม่มีเอกสาร': 'No documents yet',
    'ไม่พบเอกสาร': 'No documents found',
    'ยังไม่มีประกาศ': 'No announcements yet',
    'ยังไม่มีประกาศในขณะนี้': 'No announcements right now',
    'ไม่พบประกาศที่ค้นหา': 'No matching announcements found',
    'เอกสารทั้งหมด': 'All documents',
    'เอกสารใกล้หมดอายุ': 'Expiring documents',
    'เอกสารหมดอายุแล้ว': 'Expired documents',
    'เอกสารสถานะปกติ': 'Active documents',
    'เอกสารอัปโหลดล่าสุด': 'Recently uploaded documents',
    'เอกสารตามระยะหมดอายุ': 'Documents by expiry period',
    'การแจ้งเตือนเอกสาร': 'Document alerts',
    'ไม่มีเอกสารที่ต้องแจ้งเตือน': 'No documents need alerts',
    'ชื่อเอกสาร': 'Document name',
    'ชื่อเต็ม': 'Full name',
    'ประเภท': 'Type',
    'ประเภทเอกสาร': 'Document type',
    'เจ้าของ': 'Owner',
    'เจ้าของเอกสาร': 'Document owner',
    'หลักสูตร': 'Program',
    'สังกัด': 'Affiliation',
    'อาจารย์ที่ปรึกษา': 'Advisor',
    'อีเมล': 'Email',
    'สถานะ': 'Status',
    'ไฟล์': 'Files',
    'ไฟล์แนบ': 'Attachments',
    'ไฟล์แนบและเวอร์ชัน': 'Attachments and versions',
    'วันหมดอายุ': 'Expiration date',
    'วันที่ออก': 'Issue date',
    'วันที่อัปโหลด': 'Uploaded date',
    'วันที่เพิ่ม': 'Created date',
    'คงเหลือ': 'Remaining',
    'ปกติ': 'Active',
    'ใกล้หมดอายุ': 'Expiring soon',
    'หมดอายุ': 'Expired',
    'หมดอายุแล้ว': 'Expired',
    'ไม่มีวันหมดอายุ': 'No expiration date',
    'ทั้งหมด': 'All',
    'ทุกประเภท': 'All types',
    'ทุกสถานะ': 'All statuses',
    'ทุกระดับ': 'All levels',
    'ทุกหลักสูตร': 'All programs',
    'ไม่ระบุ': 'Unspecified',
    'ไม่ระบุหลักสูตร': 'Unspecified program',
    'ค้นหา...': 'Search...',
    'ค้นหาประกาศ...': 'Search announcements...',
    'ค้นหาชื่อเอกสารหรือเจ้าของ...': 'Search document name or owner...',
    'ค้นหารหัสหรือชื่อประเภท...': 'Search code or type name...',
    'ค้นหาเอกสาร': 'Search documents',
    'บันทึก': 'Save',
    'กำลังบันทึก...': 'Saving...',
    'ยกเลิก': 'Cancel',
    'ลบ': 'Delete',
    'ยืนยันลบ?': 'Confirm delete?',
    'ยืนยัน': 'Confirm',
    'เพิ่ม': 'Add',
    'แก้ไข': 'Edit',
    'เผยแพร่': 'Publish',
    'เผยแพร่แล้ว': 'Published',
    'เผยแพร่ประกาศ': 'Publish announcement',
    'สร้างประกาศใหม่': 'Create announcement',
    'จัดการประกาศ': 'Announcements',
    'ประกาศทั้งหมด': 'Total announcements',
    'ประกาศที่เผยแพร่อยู่': 'Published announcements',
    'มีรูปภาพ': 'With image',
    'ตัวอย่างประกาศ': 'Announcement preview',
    'หัวข้อประกาศ': 'Announcement title',
    'เนื้อหาประกาศ': 'Announcement content',
    'รูปภาพประกอบ': 'Image',
    'ลิงก์ประกอบ': 'Related link',
    'เปลี่ยนรูป': 'Change image',
    'ลบรูปภาพ': 'Remove image',
    'ลากรูปมาวาง หรือคลิกเพื่อเลือกไฟล์': 'Drop an image here or click to choose a file',
    'เริ่มกรอกข้อมูลเพื่อดูตัวอย่าง': 'Start typing to preview',
    'เปิดลิงก์ประกอบ': 'Open related link',
    'จัดการประเภทเอกสาร': 'Document types',
    'ประเภททั้งหมด': 'Total types',
    'ลำดับถัดไป': 'Next order',
    'เพิ่มประเภทใหม่': 'Add new type',
    'เพิ่มประเภท': 'Add type',
    'ประเภทเอกสารในระบบ': 'System document types',
    'รหัส': 'Code',
    'รหัสประเภท': 'Type code',
    'ชื่อเต็ม / คำอธิบาย': 'Full name / description',
    'ลำดับ': 'Order',
    'ลำดับการแสดงผล': 'Display order',
    'ตัวอย่างที่จะแสดง': 'Display preview',
    'ข้อควรระวัง': 'Caution',
    'ประเภทย่อย': 'Subtypes',
    'ประเภทโครงการย่อย': 'Project subtypes',
    'เพิ่มประเภทโครงการใหม่': 'Add new project subtype',
    'ชื่อที่แสดง': 'Display name',
    'รหัสใช้ได้เฉพาะ A-Z, 0-9, _ และ -': 'Code can contain only A-Z, 0-9, _ and -',
    'ผู้ใช้งานในระบบ': 'System users',
    'ผู้ใช้งาน': 'Users',
    'ผู้ดูแลระบบ': 'Administrator',
    'ผู้บริหาร': 'Executive',
    'เจ้าหน้าที่': 'Staff',
    'อาจารย์': 'Advisor',
    'นักศึกษา': 'Student',
    'นักศึกษาปริญญาตรี': 'Bachelor students',
    'นักศึกษาปริญญาโท': 'Master students',
    'นักศึกษาปริญญาเอก': 'Doctoral students',
    'รายละเอียดเอกสาร': 'Document details',
    'คำอธิบาย': 'Description',
    'เอกสารหลัก': 'Main document',
    'บันทึกข้อความรับรอง': 'Certification memo',
    'ปัจจุบัน': 'Current',
    'ดู': 'View',
    'โหลด': 'Download',
    'ดาวน์โหลด': 'Download',
    'เพิ่มเวอร์ชันไฟล์': 'Add file version',
    'เลือกไฟล์เวอร์ชันใหม่': 'Choose new version files',
    'บันทึกเวอร์ชันใหม่': 'Save new version',
    'เวอร์ชันก่อนหน้า': 'Previous versions',
    'หมายเหตุเวอร์ชัน (ไม่บังคับ)': 'Version note (optional)',
    'สรุปรายหลักสูตร': 'Program summary',
    'เปรียบเทียบเอกสาร RI/IRB ตามหลักสูตร': 'Compare RI/IRB documents by program',
    'เปรียบเทียบจำนวนเอกสารรายหลักสูตร': 'Compare document counts by program',
    'เรียงตาม:': 'Sort by:',
    'จำนวนนักศึกษา': 'Student count',
    'ฉบับ': 'copies',
    'รายการ': 'items',
    'คน': 'people',
    'วัน': 'days',
    'ป.ตรี': 'Bachelor',
    'ป.โท': 'Master',
    'ป.เอก': 'Doctoral',
    'ทั้งหมดสงวนลิขสิทธิ์': 'All rights reserved',
  })
)

const englishToThaiMap = new Map(
  Object.entries({
    'Dashboard': 'แดชบอร์ด',
    'Workspace': 'พื้นที่ทำงาน',
    'Admin': 'ผู้ดูแลระบบ',
    'Admin Settings': 'ตั้งค่าผู้ดูแลระบบ',
    'Student': 'นักศึกษา',
    'Executive': 'ผู้บริหาร',
    'Account': 'บัญชีผู้ใช้',
    'Programs': 'หลักสูตร',
    'Documents': 'เอกสาร',
    'Certificates': 'เอกสารรับรอง',
    'Export CSV': 'ส่งออก CSV',
    'Search': 'ค้นหา',
    'Subject': 'หัวเรื่อง',
    'Templates': 'เทมเพลต',
    'Email template': 'เทมเพลตอีเมล',
    'Timeline': 'ไทม์ไลน์',
    'Update': 'อัปเดต',
    'Ready': 'พร้อมใช้งาน',
    'Preview': 'ตัวอย่าง',
    'Editor': 'แก้ไข',
    'Variables': 'ตัวแปร',
    'Description': 'คำอธิบาย',
    'Reason': 'เหตุผล',
    'System': 'ระบบ',
    'All': 'ทั้งหมด',
    'Active': 'ปกติ',
    'Expired': 'หมดอายุแล้ว',
    'Expiring soon': 'ใกล้หมดอายุ',
    'Loading...': 'กำลังโหลด...',
    'Save': 'บันทึก',
    'Cancel': 'ยกเลิก',
    'Delete': 'ลบ',
    'Edit': 'แก้ไข',
    'Close': 'ปิด',
    'Confirm': 'ยืนยัน',
    'View details': 'ดูรายละเอียด',
    'View all': 'ดูทั้งหมด',
    'Current': 'ปัจจุบัน',
    'Download': 'ดาวน์โหลด',
    'Upload': 'อัปโหลด',
    'Published': 'เผยแพร่แล้ว',
  })
)

const inlineRules = [
  [/^แสดง\s+(\d+)\s+จาก\s+(\d+)\s+รายการ$/, 'Showing $1 of $2 items'],
  [/^แสดง\s+(\d+)\s+รายการ$/, 'Showing $1 items'],
  [/^รวมทั้งหมด\s+(\d+)\s+คน$/, '$1 users in total'],
  [/^ทั้งหมด\s+(\d+)\s+รายการ$/, '$1 items in total'],
  [/^ทั้งหมด\s+(\d+)\s+คน$/, '$1 people in total'],
  [/^จากทั้งหมด\s+(\d+)\s+ฉบับ$/, 'of $1 copies'],
  [/^อีก\s+(\d+)\s+วัน$/, '$1 days left'],
  [/^เกินกำหนด\s+(\d+)\s+วัน$/, '$1 days overdue'],
  [/^เกิน\s+(\d+)\s+วัน$/, '$1 days overdue'],
  [/^หมดอายุใน\s+(\d+)\s+วัน$/, 'Expires in $1 days'],
  [/^หมดอายุใน\s+(\d+)-(\d+)\s+วัน$/, 'Expires in $1-$2 days'],
  [/^แก้ไขล่าสุด:\s*(.*)$/, 'Last edited: $1'],
  [/^โดย\s+(.+)$/, 'By $1'],
  [/^อาจารย์:\s*(.+)$/, 'Advisor: $1'],
  [/^อ่านประกาศ\s+(.+)$/, 'Read announcement $1'],
  [/^(\d+)\s+รายการ$/, '$1 items'],
  [/^(\d+)\s+เอกสาร$/, '$1 documents'],
  [/^(\d+)\s+ไฟล์ทั้งหมด$/, '$1 files total'],
  [/^(\d+)\s+ไฟล์$/, '$1 files'],
  [/^(\d+)\s+ฉบับ$/, '$1 copies'],
  [/^(\d+)\s+ตัวอักษร$/, '$1 characters'],
]

const termRules = [
  ['วันที่เอกสารหมดอายุ', 'document expiration date'],
  ['วันที่ออกใบประกาศ', 'certificate issue date'],
  ['ไม่มีวันหมดอายุ', 'no expiration date'],
  ['ใกล้หมดอายุ', 'expiring soon'],
  ['หมดอายุแล้ว', 'expired'],
  ['เอกสารทั้งหมด', 'all documents'],
  ['ประเภทย่อย', 'subtypes'],
  ['หลักสูตร', 'program'],
  ['รายการ', 'items'],
  ['เอกสาร', 'documents'],
  ['ไฟล์', 'files'],
  ['วัน', 'days'],
]

function shouldSkip(node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  return !element || Boolean(element.closest(SKIP_SELECTOR))
}

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim()
}

export function translateText(text, language) {
  if (!text) return text

  const leading = text.match(/^\s*/)?.[0] || ''
  const trailing = text.match(/\s*$/)?.[0] || ''
  const source = normalize(text)

  if (language === 'th') {
    return englishToThaiMap.has(source) ? `${leading}${englishToThaiMap.get(source)}${trailing}` : text
  }

  if (language !== 'en' || !text || !/[ก-๙]/.test(text)) return text

  if (phraseMap.has(source)) return `${leading}${phraseMap.get(source)}${trailing}`

  for (const [regex, replacement] of inlineRules) {
    if (regex.test(source)) return `${leading}${source.replace(regex, replacement)}${trailing}`
  }

  let translated = source
  for (const [thai, english] of termRules) {
    translated = translated.replaceAll(thai, english)
  }

  return translated !== source ? `${leading}${translated}${trailing}` : text
}

function translateTextNode(node, language) {
  if (shouldSkip(node)) return
  if (!textOriginals.has(node)) textOriginals.set(node, node.nodeValue)

  let original = textOriginals.get(node)
  const translatedOriginal = translateText(original, 'en')
  if (language === 'en' && node.nodeValue !== original && node.nodeValue !== translatedOriginal) {
    original = node.nodeValue
    textOriginals.set(node, original)
  }

  const next = language === 'en' ? translateText(original, language) : original
  if (node.nodeValue !== next) node.nodeValue = next
}

function translateAttributes(element, language) {
  if (shouldSkip(element)) return
  const attrs = ['placeholder', 'aria-label', 'title', 'alt']
  let originals = attrOriginals.get(element)
  if (!originals) {
    originals = new Map()
    attrOriginals.set(element, originals)
  }

  attrs.forEach(attr => {
    if (!element.hasAttribute(attr)) return
    if (!originals.has(attr)) originals.set(attr, element.getAttribute(attr))
    let original = originals.get(attr)
    const current = element.getAttribute(attr)
    const translatedOriginal = translateText(original, 'en')
    if (language === 'en' && current !== original && current !== translatedOriginal) {
      original = current
      originals.set(attr, original)
    }
    const next = language === 'en' ? translateText(original, language) : original
    if (element.getAttribute(attr) !== next) element.setAttribute(attr, next)
  })
}

function walk(root, language) {
  if (!root || shouldSkip(root)) return

  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, language)
    return
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return

  if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root, language)

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  let node = walker.nextNode()
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, language)
    if (node.nodeType === Node.ELEMENT_NODE) translateAttributes(node, language)
    node = walker.nextNode()
  }
}

export function applyDomTranslations(language) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }

  const root = document.getElementById('root') || document.body
  walk(root, language)
  document.documentElement.setAttribute(ROOT_ATTR, language)

  let frame = null
  const schedule = () => {
    if (frame) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      walk(root, language)
      frame = null
    })
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' || mutation.type === 'attributes' || mutation.type === 'characterData') {
        schedule()
        break
      }
    }
  })

  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['placeholder', 'aria-label', 'title', 'alt'],
  })

  return () => {
    if (frame) cancelAnimationFrame(frame)
    observer.disconnect()
  }
}
