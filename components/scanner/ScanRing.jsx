export default function ScanRing({ active }) {
  return active ? <span className="scan-ring" aria-hidden="true" /> : null;
}
