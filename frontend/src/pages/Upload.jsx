import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { uploadFile, confirmUpload, getUploadSummary } from '../api/client'
import {
  Upload, CheckCircle, AlertCircle, FileSpreadsheet,
  ArrowRight, X, TrendingUp, Package, RefreshCw, Database,
  BarChart2, Layers
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const STAGES = { idle: 0, preview: 1, analysing: 2, done: 3 }

const PALETTE = [
  'var(--holo-green)', 'var(--holo-blue)', 'var(--holo-orange)',
  'var(--holo-pink)', '#a78bfa', '#34d399', '#f59e0b'
]

function SummaryStatCard({ icon: Icon, label, value, color, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div style={{
      flex: 1, minWidth: '130px',
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${color}40`,
      borderRadius: '14px',
      padding: '18px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.45s ease, transform 0.45s ease',
      boxShadow: `0 0 20px ${color}15`,
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px',
        background: `${color}18`, border: `1px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <p style={{ fontSize: '10px', color: 'var(--holo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>{label}</p>
        <p style={{ fontSize: '28px', fontWeight: 800, color, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  )
}

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(15,18,26,0.95)', border: '1px solid var(--holo-border)',
      borderRadius: '10px', padding: '8px 14px', fontSize: '12px',
      backdropFilter: 'blur(12px)',
    }}>
      <p style={{ color: 'var(--holo-text)', fontWeight: 700 }}>{label}</p>
      <p style={{ color: 'var(--holo-green)', marginTop: '3px' }}>{payload[0].value} items</p>
    </div>
  )
}

export default function UploadPage() {
  const navigate = useNavigate()
  const [stage, setStage] = useState(STAGES.idle)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)
  const [targetTable, setTargetTable] = useState('')

  const ALLOWED_EXTS = ['xlsx', 'xls', 'csv']

  const onDrop = useCallback(async (files) => {
    const file = files[0]
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    if (!ALLOWED_EXTS.includes(ext)) {
      setError(`Unsupported file type ".${ext}". Please upload a .xlsx, .xls, or .csv file.`)
      return
    }

    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (targetTable) fd.append('target_table', targetTable)
      const res = await uploadFile(fd)
      setPreview(res.data)
      setStage(STAGES.preview)
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed. Make sure the backend is running.')
    } finally {
      setUploading(false)
    }
  }, [targetTable])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: undefined, multiple: false,
  })

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      const res = await confirmUpload(preview.upload_id)
      const confirmData = res.data
      setResult(confirmData)

      // Fetch rich summary from backend
      if (confirmData.summary_id) {
        try {
          const sumRes = await getUploadSummary(confirmData.summary_id)
          setSummary(sumRes.data)
        } catch (_) {
          // summary fetch failed — still show done screen without breakdown
          setSummary(null)
        }
      }
      setStage(STAGES.done)
    } catch (e) {
      setError(e.response?.data?.detail || 'Commit failed')
    } finally {
      setConfirming(false)
    }
  }

  const reset = () => {
    setStage(STAGES.idle)
    setPreview(null)
    setResult(null)
    setSummary(null)
    setError(null)
  }

  const goToDashboard = () => {
    navigate('/', { state: { fromUpload: true } })
  }

  // Category chart data
  const categoryData = summary?.categories
    ? Object.entries(summary.categories).map(([name, count]) => ({ name, count }))
    : []

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Upload size={22} style={{ color: 'var(--holo-green)' }} /> Upload Ingestion Logs
        </h1>
        <p className="page-subtitle">
          Import spreadsheet logs — Claude AI maps column headers to schema fields automatically
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 card flex items-start gap-3"
             style={{ borderColor: 'var(--holo-pink-border)', background: 'var(--holo-pink-dim)' }}>
          <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--holo-pink)' }} />
          <p className="text-sm" style={{ color: 'var(--holo-pink)' }}>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto" style={{ color: 'var(--holo-text-muted)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stage 0: Drop Zone */}
      {stage === STAGES.idle && (
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm font-semibold" style={{ color: 'var(--holo-text)' }}>Target Table:</label>
          <select
            value={targetTable}
            onChange={(e) => setTargetTable(e.target.value)}
            className="p-2 rounded-lg text-sm bg-transparent border focus:outline-none focus:ring-1 focus:ring-[var(--holo-green)] transition-all"
            style={{ borderColor: 'var(--holo-border)', color: 'var(--holo-text)', background: 'var(--holo-glass)' }}
          >
            <option value="" style={{ background: '#0a0d14' }}>Auto-detect (AI)</option>
            <option value="products" style={{ background: '#0a0d14' }}>Products</option>
            <option value="inventory" style={{ background: '#0a0d14' }}>Inventory</option>
            <option value="suppliers" style={{ background: '#0a0d14' }}>Suppliers</option>
            <option value="sales_history" style={{ background: '#0a0d14' }}>Sales History</option>
            <option value="manufacturing_runs" style={{ background: '#0a0d14' }}>Manufacturing Runs</option>
          </select>
        </div>
      )}

      {stage === STAGES.idle && (
        <div
          {...getRootProps()}
          className="border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300"
          style={isDragActive
            ? { borderColor: 'var(--holo-green)', background: 'var(--holo-green-dim)' }
            : { borderColor: 'var(--holo-border)', background: 'var(--holo-glass)' }
          }
          onMouseEnter={e => {
            if (!isDragActive) {
              e.currentTarget.style.borderColor = 'var(--holo-green-border)'
              e.currentTarget.style.background = 'var(--holo-glass-active)'
            }
          }}
          onMouseLeave={e => {
            if (!isDragActive) {
              e.currentTarget.style.borderColor = 'var(--holo-border)'
              e.currentTarget.style.background = 'var(--holo-glass)'
            }
          }}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300"
                 style={{ background: isDragActive ? 'var(--holo-green-dim)' : 'rgba(255,255,255,0.02)', border: '1px solid var(--holo-border)' }}>
              {uploading
                ? <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                       style={{ borderColor: 'var(--holo-green)', borderTopColor: 'transparent' }} />
                : <FileSpreadsheet size={28} style={{ color: isDragActive ? 'var(--holo-green)' : 'var(--holo-text-muted)' }} />
              }
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ color: 'var(--holo-text)' }}>
                {isDragActive ? 'Drop your spreadsheet here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--holo-text-muted)' }}>
                Supports .xlsx, .xls, .csv · AI maps headers automatically
              </p>
            </div>
            {!uploading && (
              <button className="btn-primary text-sm">
                <Upload size={14} className="inline mr-2" />
                Browse Ingestion Folder
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stage 1: Preview */}
      {stage === STAGES.preview && preview && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold" style={{ color: 'var(--holo-text)' }}>{preview.filename}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--holo-text-muted)' }}>
                  {preview.row_count} rows · Target table:
                  <span className="ml-1 font-mono font-bold" style={{ color: 'var(--holo-green)' }}>{preview.target_table}</span>
                </p>
              </div>
              <button onClick={reset} className="btn-secondary text-xs flex items-center gap-1.5">
                <X size={12} /> Cancel Ingest
              </button>
            </div>

            {/* Column Mapping */}
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--holo-text-muted)' }}>
                AI Header Synonyms Mapping
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.column_mapping).map(([from, to]) => (
                  <div key={from}
                       className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
                       style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--holo-border)' }}>
                    <span className="font-mono" style={{ color: 'var(--holo-text-sub)' }}>{from}</span>
                    <ArrowRight size={10} style={{ color: 'var(--holo-green)' }} />
                    <span className="font-mono font-semibold" style={{ color: 'var(--holo-green)' }}>{to}</span>
                  </div>
                ))}
                {preview.unmapped_columns?.map(col => (
                  <div key={col}
                       className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
                       style={{ background: 'var(--holo-orange-dim)', border: '1px solid var(--holo-orange-border)' }}>
                    <span className="font-mono" style={{ color: 'var(--holo-orange)' }}>{col}</span>
                    <span style={{ color: 'var(--holo-orange)' }}>unmapped</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Flagged rows warning */}
            {preview.flagged_rows?.length > 0 && (
              <div className="rounded-xl p-3 mb-4"
                   style={{ background: 'var(--holo-orange-dim)', border: '1px solid var(--holo-orange-border)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--holo-orange)' }}>
                  ⚠ {preview.flagged_rows.length} row(s) have validation issues (will be skipped)
                </p>
                {preview.flagged_rows.slice(0, 3).map((r, i) => (
                  <p key={i} className="text-xs font-mono" style={{ color: 'var(--holo-text-sub)' }}>
                    Row {r._row_index}: {r._issues?.join(', ')}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Preview Table */}
          <div className="card overflow-x-auto !p-0">
            <p className="text-xs font-semibold uppercase tracking-wider p-4" style={{ color: 'var(--holo-text-muted)' }}>
              Data Preview ({Math.min(preview.preview_rows.length, 10)} clean rows detected)
            </p>
            {preview.preview_rows.length > 0 ? (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--holo-border)' }}>
                    {Object.keys(preview.preview_rows[0])
                      .filter(k => !k.startsWith('_'))
                      .map(col => (
                        <th key={col} className="table-header py-3 px-4">{col}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview_rows.slice(0, 10).map((row, i) => (
                    <tr key={i}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid var(--holo-border)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      {Object.entries(row)
                        .filter(([k]) => !k.startsWith('_'))
                        .map(([k, v]) => (
                          <td key={k} className="table-cell" style={{ color: 'var(--holo-text)' }}>{String(v ?? '—')}</td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm p-4" style={{ color: 'var(--holo-text-muted)' }}>No clean rows to preview.</p>
            )}
          </div>

          {/* Confirm */}
          <div className="flex justify-end gap-3">
            <button onClick={reset} className="btn-secondary">Cancel Ingest</button>
            <button
              onClick={handleConfirm}
              disabled={confirming || preview.preview_rows.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {confirming
                ? <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#080a0f', borderTopColor: 'transparent' }} /><span>Analysing data…</span></>
                : <><CheckCircle size={15} /><span>Commit Ingest ({preview.preview_rows.length} rows)</span></>
              }
            </button>
          </div>
        </div>
      )}

      {/* Stage 3: Done — Rich Analytics Summary */}
      {stage === STAGES.done && result && (
        <div className="space-y-5">

          {/* Success header */}
          <div className="card text-center py-8"
               style={{ borderColor: 'var(--holo-green-border)', background: 'linear-gradient(135deg, rgba(197,241,53,0.06) 0%, rgba(197,241,53,0.02) 100%)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                 style={{ background: 'rgba(197,241,53,0.15)', border: '1px solid var(--holo-green-border)', boxShadow: '0 0 30px rgba(197,241,53,0.2)' }}>
              <CheckCircle size={32} style={{ color: 'var(--holo-green)' }} />
            </div>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--holo-text)', fontFamily: 'Space Grotesk, sans-serif' }}>
              Ingest Successful
            </h2>
            <p style={{ color: 'var(--holo-text-muted)', fontSize: '13px' }}>
              Data committed to{' '}
              <span className="font-mono font-bold" style={{ color: 'var(--holo-green)' }}>
                {result.target_table}
              </span>
              {' '}· Supabase updated
            </p>
            {result.errors?.length > 0 && (
              <p className="text-sm mt-2" style={{ color: 'var(--holo-orange)' }}>
                {result.errors.length} rows skipped due to validation errors
              </p>
            )}
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <SummaryStatCard
              icon={Database}
              label="Rows Inserted"
              value={result.inserted}
              color="var(--holo-green)"
              delay={0}
            />
            <SummaryStatCard
              icon={RefreshCw}
              label="Rows Updated"
              value={result.updated || 0}
              color="var(--holo-blue)"
              delay={80}
            />
            <SummaryStatCard
              icon={AlertCircle}
              label="Rows Skipped"
              value={result.errors?.length || 0}
              color={result.errors?.length ? 'var(--holo-orange)' : 'var(--holo-text-muted)'}
              delay={160}
            />
            {summary && (
              <SummaryStatCard
                icon={Layers}
                label="Total Processed"
                value={summary.total_processed || (result.inserted + (result.updated || 0) + (result.errors?.length || 0))}
                color="var(--holo-pink)"
                delay={240}
              />
            )}
          </div>

          {/* Category Breakdown chart */}
          {categoryData.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <BarChart2 size={16} style={{ color: 'var(--holo-green)' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--holo-text)' }}>Category Breakdown</h3>
                <span style={{ fontSize: '11px', color: 'var(--holo-text-muted)', marginLeft: 'auto' }}>
                  {categoryData.length} categories detected
                </span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={categoryData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--holo-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--holo-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Revenue total (for sales_history) */}
          {summary?.revenue_total > 0 && (
            <div className="card" style={{ borderColor: 'var(--holo-green-border)', background: 'rgba(197,241,53,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <TrendingUp size={16} style={{ color: 'var(--holo-green)' }} />
                <p style={{ fontSize: '13px', color: 'var(--holo-text-muted)' }}>Total Revenue in Uploaded Data</p>
                <p style={{ marginLeft: 'auto', fontSize: '22px', fontWeight: 800, color: 'var(--holo-green)', fontFamily: 'Space Grotesk, sans-serif' }}>
                  ${summary.revenue_total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}

          {/* Top items */}
          {summary?.top_items?.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Package size={16} style={{ color: 'var(--holo-orange)' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--holo-text)' }}>Top Items from Upload</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary.top_items.map((item, i) => {
                  const maxVal = summary.top_items[0]?.value || 1
                  const pct = Math.max(4, Math.round((item.value / maxVal) * 100))
                  const color = PALETTE[i % PALETTE.length]
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '18px', fontSize: '11px', fontWeight: 700, color: 'var(--holo-text-muted)', flexShrink: 0 }}>#{i+1}</span>
                      <span style={{ fontSize: '13px', color: 'var(--holo-text)', minWidth: '140px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.name}</span>
                      <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color, flexShrink: 0, minWidth: '60px', textAlign: 'right' }}>
                        {typeof item.value === 'number' && item.label === 'revenue'
                          ? `$${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : item.value.toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-4 pt-2">
            <button onClick={reset} className="btn-secondary">
              Upload Another Dataset
            </button>
            <button onClick={goToDashboard} className="btn-primary flex items-center gap-2">
              <TrendingUp size={15} />
              View Updated Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
