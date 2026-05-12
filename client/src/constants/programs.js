export const PROGRAMS_BY_DEGREE = {
  bachelor: [
    'วท.บ. เทคโนโลยีบรรจุภัณฑ์และการพิมพ์',
    'ทล.บ. เทคโนโลยีอุตสาหกรรม',
    'วท.บ. วิทยาการคอมพิวเตอร์ประยุกต์-มัลติมีเดีย',
    'ค.อ.บ. วิศวกรรมเครื่องกล (หลักสูตร 5 ปี)',
    'ค.อ.บ. วิศวกรรมไฟฟ้า (หลักสูตร 5 ปี)',
    'ค.อ.บ. วิศวกรรมโยธา (หลักสูตร 5 ปี)',
    'ค.อ.บ. วิศวกรรมอุตสาหการ (หลักสูตร 5 ปี)',
    'ทล.บ. เทคโนโลยีดิจิทัลทางการศึกษาและสื่อสารมวลชน',
  ],
  master: [
    'ค.อ.ม. วิศวกรรมเครื่องกล',
    'ค.อ.ม. วิศวกรรมไฟฟ้า',
    'ค.อ.ม. เทคโนโลยีดิจิทัลการเรียนรู้และสื่อสารมวลชน',
    'ค.อ.ม. คอมพิวเตอร์และเทคโนโลยีสารสนเทศ',
    'ค.อ.ม. วิศวกรรมโยธา',
    'ค.อ.ม. วิศวกรรมอุตสาหการ',
    'วท.ม. เทคโนโลยีบรรจุภัณฑ์และนวัตกรรมการพิมพ์',
  ],
  doctoral: [
    'ปร.ด. นวัตกรรมการเรียนรู้และเทคโนโลยี',
  ],
}

export const ALL_PROGRAMS = [...new Set(Object.values(PROGRAMS_BY_DEGREE).flat())]

export const DEAN_OFFICE = 'สำนักงานคณบดี'

export const EXECUTIVE_PROGRAM_OPTIONS = [DEAN_OFFICE]

export const ALL_PROGRAM_OPTIONS = [DEAN_OFFICE, ...ALL_PROGRAMS]

export const AFFILIATIONS = [
  DEAN_OFFICE,
  'ครุศาสตร์เครื่องกล',
  'ครุศาสตร์โยธา',
  'ครุศาสตร์ไฟฟ้า',
  'ครุศาสตร์อุตสาหการ',
  'เทคโนโลยีและสื่อสารการศึกษา',
  'เทคโนโลยีการพิมพ์และบรรจุภัณฑ์',
  'วิทยการคอมพิวเตอร์ประยุกต์และมัลติมีเดีย',
]

export const getDegreeForProgram = (program) => {
  if (!program) return ''

  const matches = Object.entries(PROGRAMS_BY_DEGREE)
    .filter(([, programs]) => programs.includes(program))
    .map(([degree]) => degree)

  return matches.length === 1 ? matches[0] : ''
}
