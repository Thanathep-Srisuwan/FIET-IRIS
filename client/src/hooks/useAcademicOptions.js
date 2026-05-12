import { useEffect, useState } from 'react'
import { AFFILIATIONS, ALL_PROGRAMS, DEAN_OFFICE, PROGRAMS_BY_DEGREE } from '../constants/programs'
import { referenceService } from '../services/api'

const fallback = {
  programsByDegree: PROGRAMS_BY_DEGREE,
  programs: ALL_PROGRAMS,
  affiliations: AFFILIATIONS,
  deanOffice: DEAN_OFFICE,
}

export default function useAcademicOptions() {
  const [options, setOptions] = useState(fallback)

  useEffect(() => {
    let alive = true
    referenceService.getAcademicOptions()
      .then(({ data }) => {
        if (!alive) return
        setOptions({
          programsByDegree: data.programsByDegree || fallback.programsByDegree,
          programs: data.programs || fallback.programs,
          affiliations: data.affiliations || fallback.affiliations,
          deanOffice: data.deanOffice || fallback.deanOffice,
        })
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  return options
}
