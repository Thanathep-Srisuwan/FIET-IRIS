import { useEffect, useMemo, useState } from 'react'
import { programService } from '../../services/api'
import toast from 'react-hot-toast'
import { GraduationCap, Building2, Search, Pencil, Check, X, Plus } from 'lucide-react'

const DEGREE_LABELS = {
  bachelor: 'ปริญญาตรี',
  master: 'ปริญญาโท',
  doctoral: 'ปริญญาเอก',
}

const DEGREE_COLORS = {
  bachelor: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800',
  master: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800',
  doctoral: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800',
}

function DegreeBadge({ level }) {
  return (
    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold whitespace-nowrap ${DEGREE_COLORS[level] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {DEGREE_LABELS[level] || level}
    </span>
  )
}

function StatusDot({ active }) {
  return (
    <span className={`inline-flex h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
  )
}

function DeleteButton({ label, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (!confirming) { setConfirming(true); return }
    setLoading(true)
    try { await onDelete() } finally { setLoading(false); setConfirming(false) }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
        confirming
          ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900'
          : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-red-600 hover:border-red-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:text-red-300'
      }`}
    >
      {loading ? '...' : confirming ? 'ยืนยันลบ?' : 'ลบ'}
    </button>
  )
}

function InlineEdit({ value, onSave, onCancel }) {
  const [text, setText] = useState(value)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const trimmed = text.trim()
    if (!trimmed || trimmed === value) { onCancel(); return }
    setSaving(true)
    try { await onSave(trimmed) } finally { setSaving(false) }
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel() }}
        className="flex-1 rounded-lg border border-primary-300 bg-white dark:bg-slate-800 dark:border-primary-700 px-2.5 py-1 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      />
      <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 disabled:opacity-50">
        <Check size={14} strokeWidth={2.5} />
      </button>
      <button onClick={onCancel} className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400">
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  )
}

// ===== Programs Tab =====

function ProgramsTab() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [degreeFilter, setDegreeFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ degree_level: 'bachelor', program_name: '' })
  const [saving, setSaving] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data } = await programService.getPrograms()
      setPrograms(data || [])
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const filtered = useMemo(() => {
    let list = programs
    if (degreeFilter !== 'all') list = list.filter(p => p.degree_level === degreeFilter)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter(p => p.program_name.toLowerCase().includes(q))
    return list
  }, [programs, degreeFilter, query])

  const stats = useMemo(() => ({
    total: programs.length,
    active: programs.filter(p => p.is_active).length,
  }), [programs])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.program_name.trim()) { toast.error('กรุณากรอกชื่อหลักสูตร'); return }
    setSaving(true)
    try {
      const { data } = await programService.createProgram({ degree_level: form.degree_level, program_name: form.program_name.trim() })
      setPrograms(prev => [...prev, data])
      setForm(prev => ({ ...prev, program_name: '' }))
      toast.success('เพิ่มหลักสูตรสำเร็จ')
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  const handleRename = async (id, newName) => {
    const prog = programs.find(p => p.program_id === id)
    try {
      const { data } = await programService.updateProgram(id, { program_name: newName, degree_level: prog.degree_level, sort_order: prog.sort_order, is_active: prog.is_active })
      setPrograms(prev => prev.map(p => p.program_id === id ? data : p))
      setEditingId(null)
      toast.success('แก้ไขชื่อหลักสูตรสำเร็จ')
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    }
  }

  const handleToggle = async (prog) => {
    try {
      const { data } = await programService.updateProgram(prog.program_id, {
        program_name: prog.program_name,
        degree_level: prog.degree_level,
        sort_order: prog.sort_order,
        is_active: !prog.is_active,
      })
      setPrograms(prev => prev.map(p => p.program_id === prog.program_id ? data : p))
      toast.success(data.is_active ? 'เปิดใช้งานหลักสูตรแล้ว' : 'ปิดใช้งานหลักสูตรแล้ว')
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    }
  }

  const handleDelete = async (id) => {
    try {
      await programService.deleteProgram(id)
      setPrograms(prev => prev.filter(p => p.program_id !== id))
      toast.success('ลบหลักสูตรสำเร็จ')
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-5">
      {/* Left: stats + add form */}
      <aside className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-400">ทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-400">เปิดใช้งาน</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Plus size={16} strokeWidth={2.5} className="text-primary-600" />
            เพิ่มหลักสูตรใหม่
          </h2>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">ระดับการศึกษา</label>
            <select
              value={form.degree_level}
              onChange={e => setForm(prev => ({ ...prev, degree_level: e.target.value }))}
              className="input-field mt-1.5"
            >
              <option value="bachelor">ปริญญาตรี</option>
              <option value="master">ปริญญาโท</option>
              <option value="doctoral">ปริญญาเอก</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">ชื่อหลักสูตร</label>
            <input
              type="text"
              value={form.program_name}
              onChange={e => setForm(prev => ({ ...prev, program_name: e.target.value }))}
              placeholder="เช่น วท.บ. เทคโนโลยีบรรจุภัณฑ์"
              maxLength={200}
              className="input-field mt-1.5"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-700 hover:bg-primary-800 transition-colors disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'เพิ่มหลักสูตร'}
          </button>
        </form>

        <section className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-4">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">ข้อควรระวัง</p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-2 leading-relaxed">
            ไม่สามารถลบหลักสูตรที่มีผู้ใช้อยู่ได้ ให้ปิดการใช้งาน (toggle) แทน เพื่อซ่อนจากตัวเลือกโดยไม่สูญเสียข้อมูล
          </p>
        </section>
      </aside>

      {/* Right: table */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            หลักสูตรในระบบ
            <span className="ml-2 text-sm font-normal text-slate-400">({filtered.length}/{programs.length})</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={degreeFilter}
              onChange={e => setDegreeFilter(e.target.value)}
              className="input-field text-sm py-2 w-full sm:w-36"
            >
              <option value="all">ทุกระดับ</option>
              <option value="bachelor">ปริญญาตรี</option>
              <option value="master">ปริญญาโท</option>
              <option value="doctoral">ปริญญาเอก</option>
            </select>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อหลักสูตร..."
                className="input-field pl-9 text-sm py-2"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <GraduationCap size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">ไม่พบหลักสูตร</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 580 }}>
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  {['ระดับ', 'ชื่อหลักสูตร', 'สถานะ', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(prog => (
                  <tr key={prog.program_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <DegreeBadge level={prog.degree_level} />
                    </td>
                    <td className="px-5 py-3.5 w-full">
                      {editingId === prog.program_id ? (
                        <InlineEdit
                          value={prog.program_name}
                          onSave={(name) => handleRename(prog.program_id, name)}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <span className={`font-medium ${prog.is_active ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                          {prog.program_name}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggle(prog)}
                        className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                        title={prog.is_active ? 'คลิกเพื่อปิดใช้งาน' : 'คลิกเพื่อเปิดใช้งาน'}
                      >
                        <StatusDot active={prog.is_active} />
                        <span className={prog.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}>
                          {prog.is_active ? 'เปิด' : 'ปิด'}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        {editingId !== prog.program_id && (
                          <button
                            onClick={() => setEditingId(prog.program_id)}
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-primary-50 hover:text-primary-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:text-primary-400 transition-colors"
                            title="แก้ไขชื่อ"
                          >
                            <Pencil size={13} strokeWidth={2.5} />
                          </button>
                        )}
                        <DeleteButton label={prog.program_name} onDelete={() => handleDelete(prog.program_id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

// ===== Affiliations Tab =====

function AffiliationsTab() {
  const [affiliations, setAffiliations] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [formName, setFormName] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data } = await programService.getAffiliations()
      setAffiliations(data || [])
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return affiliations
    return affiliations.filter(a => a.affiliation_name.toLowerCase().includes(q))
  }, [affiliations, query])

  const stats = useMemo(() => ({
    total: affiliations.length,
    active: affiliations.filter(a => a.is_active).length,
  }), [affiliations])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!formName.trim()) { toast.error('กรุณากรอกชื่อสังกัด'); return }
    setSaving(true)
    try {
      const { data } = await programService.createAffiliation({ affiliation_name: formName.trim() })
      setAffiliations(prev => [...prev, data])
      setFormName('')
      toast.success('เพิ่มสังกัดสำเร็จ')
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  const handleRename = async (id, newName) => {
    const aff = affiliations.find(a => a.affiliation_id === id)
    try {
      const { data } = await programService.updateAffiliation(id, { affiliation_name: newName, sort_order: aff.sort_order, is_active: aff.is_active })
      setAffiliations(prev => prev.map(a => a.affiliation_id === id ? data : a))
      setEditingId(null)
      toast.success('แก้ไขชื่อสังกัดสำเร็จ')
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    }
  }

  const handleToggle = async (aff) => {
    try {
      const { data } = await programService.updateAffiliation(aff.affiliation_id, {
        affiliation_name: aff.affiliation_name,
        sort_order: aff.sort_order,
        is_active: !aff.is_active,
      })
      setAffiliations(prev => prev.map(a => a.affiliation_id === aff.affiliation_id ? data : a))
      toast.success(data.is_active ? 'เปิดใช้งานสังกัดแล้ว' : 'ปิดใช้งานสังกัดแล้ว')
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    }
  }

  const handleDelete = async (id) => {
    try {
      await programService.deleteAffiliation(id)
      setAffiliations(prev => prev.filter(a => a.affiliation_id !== id))
      toast.success('ลบสังกัดสำเร็จ')
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-5">
      <aside className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-400">ทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-400">เปิดใช้งาน</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Plus size={16} strokeWidth={2.5} className="text-primary-600" />
            เพิ่มสังกัดใหม่
          </h2>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">ชื่อสังกัด</label>
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="เช่น ครุศาสตร์เครื่องกล"
              maxLength={200}
              className="input-field mt-1.5"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-700 hover:bg-primary-800 transition-colors disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'เพิ่มสังกัด'}
          </button>
        </form>

        <section className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-4">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">ข้อควรระวัง</p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-2 leading-relaxed">
            ไม่สามารถลบสังกัดที่มีผู้ใช้อยู่ได้ ให้ปิดการใช้งานแทน
          </p>
        </section>
      </aside>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            สังกัดในระบบ
            <span className="ml-2 text-sm font-normal text-slate-400">({filtered.length}/{affiliations.length})</span>
          </h2>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อสังกัด..."
              className="input-field pl-9 text-sm py-2"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">ไม่พบสังกัด</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 480 }}>
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  {['ชื่อสังกัด', 'สถานะ', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(aff => (
                  <tr key={aff.affiliation_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5 w-full">
                      {editingId === aff.affiliation_id ? (
                        <InlineEdit
                          value={aff.affiliation_name}
                          onSave={(name) => handleRename(aff.affiliation_id, name)}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <span className={`font-medium ${aff.is_active ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                          {aff.affiliation_name}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggle(aff)}
                        className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                        title={aff.is_active ? 'คลิกเพื่อปิดใช้งาน' : 'คลิกเพื่อเปิดใช้งาน'}
                      >
                        <StatusDot active={aff.is_active} />
                        <span className={aff.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}>
                          {aff.is_active ? 'เปิด' : 'ปิด'}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        {editingId !== aff.affiliation_id && (
                          <button
                            onClick={() => setEditingId(aff.affiliation_id)}
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-primary-50 hover:text-primary-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:text-primary-400 transition-colors"
                            title="แก้ไขชื่อ"
                          >
                            <Pencil size={13} strokeWidth={2.5} />
                          </button>
                        )}
                        <DeleteButton label={aff.affiliation_name} onDelete={() => handleDelete(aff.affiliation_id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

// ===== Main Page =====

export default function AdminProgramsPage() {
  const [tab, setTab] = useState('programs')

  return (
    <div className="max-w-7xl space-y-6">
      <header>
        <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">จัดการหลักสูตรและสังกัด</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          แก้ไขชื่อหลักสูตรและสังกัดที่แสดงระบบ
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setTab('programs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            tab === 'programs'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <GraduationCap size={16} strokeWidth={2} />
          หลักสูตร
        </button>
        <button
          onClick={() => setTab('affiliations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            tab === 'affiliations'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Building2 size={16} strokeWidth={2} />
          สังกัด
        </button>
      </div>

      {tab === 'programs' ? <ProgramsTab /> : <AffiliationsTab />}
    </div>
  )
}
