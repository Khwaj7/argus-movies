import type { MediaType } from './lib/media'
import { MEDIA_TYPE_ICON, MEDIA_TYPE_LABEL } from './lib/media'

// Film / série marker. Its own file because both App and MediaDetail use it.
export default function MediaBadge({ mediaType }: { mediaType: MediaType }) {
  return (
    <span className="media-badge">
      {MEDIA_TYPE_ICON[mediaType]} {MEDIA_TYPE_LABEL[mediaType]}
    </span>
  )
}
