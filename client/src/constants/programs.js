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

export const PROGRAM_ENGLISH_NAMES = {
  'วท.บ. เทคโนโลยีบรรจุภัณฑ์และการพิมพ์': 'B.Sc. Packaging and Printing Technology',
  'ทล.บ. เทคโนโลยีอุตสาหกรรม': 'B.Tech. Industrial Technology',
  'วท.บ. วิทยาการคอมพิวเตอร์ประยุกต์-มัลติมีเดีย': 'B.Sc. Applied Computer Science-Multimedia',
  'ค.อ.บ. วิศวกรรมเครื่องกล (หลักสูตร 5 ปี)': 'B.S.Ind.Ed. Mechanical Engineering (5 Years Program)',
  'ค.อ.บ. วิศวกรรมไฟฟ้า (หลักสูตร 5 ปี)': 'B.S.Ind.Ed. Electrical Engineering (5 Years Program)',
  'ค.อ.บ. วิศวกรรมโยธา (หลักสูตร 5 ปี)': 'B.S.Ind.Ed. Civil Engineering (5 Years Program)',
  'ค.อ.บ. วิศวกรรมอุตสาหการ (หลักสูตร 5 ปี)': 'B.S.Ind.Ed. Production Engineering (5 Years Program)',
  'ทล.บ. เทคโนโลยีดิจิทัลทางการศึกษาและสื่อสารมวลชน': 'B.Tech. Educational Digital Technology and Mass Communication',
  'ค.อ.ม. วิศวกรรมเครื่องกล': 'M.S.Ind.Ed. Mechanical Engineering',
  'ค.อ.ม. วิศวกรรมไฟฟ้า': 'M.S.Ind.Ed. Electrical Engineering',
  'ค.อ.ม. เทคโนโลยีดิจิทัลการเรียนรู้และสื่อสารมวลชน': 'M.S.Ind.Ed. Learning Digital Technology and Mass Communication',
  'ค.อ.ม. คอมพิวเตอร์และเทคโนโลยีสารสนเทศ': 'M.S.Ind.Ed. Computer and Information Technology',
  'ค.อ.ม. วิศวกรรมโยธา': 'M.S.Ind.Ed. Civil Engineering',
  'ค.อ.ม. วิศวกรรมอุตสาหการ': 'M.S.Ind.Ed. Production Engineering',
  'วท.ม. เทคโนโลยีบรรจุภัณฑ์และนวัตกรรมการพิมพ์': 'M.Sc. Packaging Technology and Printing Innovation',
  'ปร.ด. นวัตกรรมการเรียนรู้และเทคโนโลยี': 'Ph.D. Learning Innovation and Technology',
}

export const getProgramDisplayName = (program, language = 'th') => {
  if (!program) return program
  return language === 'en' ? (PROGRAM_ENGLISH_NAMES[program] || program) : program
}

export const getProgramSourceName = (program) => {
  if (!program) return program
  const match = Object.entries(PROGRAM_ENGLISH_NAMES)
    .find(([, englishName]) => englishName.toLowerCase() === String(program).toLowerCase())
  return match?.[0] || program
}
