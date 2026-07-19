import { useState } from 'react'
import { APP_VERSION, CHANGELOG } from './changelog'

// Fixed badge in the top-right corner; clicking it opens the changelog of
// every version. Rendered once at the app root so it shows on all views.
export default function VersionBadge() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="version-badge"
        onClick={() => setOpen(true)}
        title="Voir le changelog"
      >
        v{APP_VERSION}
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="modal changelog-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Changelog</h2>
            <ul className="changelog-list">
              {CHANGELOG.map((entry) => (
                <li key={entry.version} className="changelog-entry">
                  <div className="changelog-head">
                    <span className="changelog-version">v{entry.version}</span>
                    <span className="changelog-name">{entry.title}</span>
                    <span className="changelog-date">{entry.date}</span>
                  </div>
                  <ul className="changelog-changes">
                    {entry.changes.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setOpen(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
