// Single source of truth for narration, subtitles and reveal timing.
// Built by: node scripts/build-video.mjs k8s-disaster-recovery
//
// Marker syntax inside narration:
//   [[id|Spoken words]]  the element #id reveals on the first spoken word
//   [[id]]               a timing mark on the next spoken word (no text)
//
// Facts used (checked against upstream docs):
//   - `etcdctl snapshot save` writes the etcd keyspace to one file; since etcd 3.5
//     restore is `etcdutl snapshot restore`, which writes a NEW data directory.
//   - etcd holds API objects only: PersistentVolume contents are not in the snapshot.
//   - CSI volume cloning: PVC.spec.dataSource kind PersistentVolumeClaim, source and
//     clone in the same namespace and the same StorageClass. A clone copies whatever
//     is on the source, corruption included.
//   - Point-in-time restore: PVC.spec.dataSource kind VolumeSnapshot
//     (snapshot.storage.k8s.io/v1).
//   - Velero backs up resource manifests plus volume snapshots / file-system backups
//     to object storage; `velero restore create --from-backup <name>` restores them,
//     including onto a different cluster (migration).

export const meta = {
  slug: "k8s-disaster-recovery",
  title: "Kubernetes Disaster Recovery",
  subtitle: "etcd snapshots · PVC clones · Velero restore",
  accent: "#326ce5",
  formats: ["port"], // 9:16 only, written to videos/k8s-disaster-recovery/
  inline: true, // self-contained index.html
  gsap: "src/shared/vendor/gsap-3.12.5.min.js",
  wps: 2.2, // narration rate, words per second
  lead: 0.9, // entry seam before the first word of each scene
  pad: 1.3, // padding after the last word of each scene
  total: 90, // target runtime; the last scene holds to fill it
};

export const scenes = [
  {
    id: "s1",
    chapter: "Outage",
    narration:
      "2 AM. Traffic flows through the [[s1-ing|ingress]] to your [[s1-pods|pods]]. " +
      "Every object lives in [[s1-etcd|etcd]]. " +
      "Then [[s1-fail|the etcd disk fails]], and a bad migration [[s1-pvc|corrupts the payments volume]]. " +
      "[[s1-three|Three layers]] bring it back.",
  },
  {
    id: "s2",
    chapter: "etcd",
    narration:
      "Layer one, cluster state. " +
      "[[s2-cmd|etcdctl snapshot save]] writes the whole keyspace to [[s2-file|one file]]. " +
      "Keep it [[s2-off|off the cluster]]. " +
      "[[s2-restore|etcdutl snapshot restore]] rebuilds the data directory, and [[s2-api|every object returns]]. " +
      "But [[s2-gap|not the bytes inside volumes]].",
  },
  {
    id: "s3",
    chapter: "Volumes",
    narration:
      "Layer two, volume data. " +
      "A CSI driver can [[s3-clone|clone]] a claim: name [[s3-src|payments-data]] as the [[s3-ds|dataSource]], " +
      "same namespace, same storage class. " +
      "But a clone [[s3-bad|copies corruption too]]. " +
      "Restore from last night's [[s3-snap|VolumeSnapshot]] instead. " +
      "[[s3-bind]]The pod remounts clean data.",
  },
  {
    id: "s4",
    chapter: "Velero",
    narration:
      "Layer three, the whole app. " +
      "Velero already saved the shop namespace, manifests and volume snapshots, as [[s4-bk|k8s-daily]]. " +
      "One command: [[s4-cmd|velero restore create, from backup k8s-daily]]. " +
      "[[s4-res]]Objects reapply, [[s4-pv]]volumes rehydrate, and [[s4-green|traffic turns green]].",
  },
  {
    id: "s5",
    chapter: "Recap",
    narration:
      "So: [[s5-a|etcd snapshots]] for cluster state. " +
      "[[s5-b|PVC clones]] for data. " +
      "[[s5-c|Velero]] for whole namespaces, even on a new cluster. " +
      "[[s5-t]]And rehearse the restore, before 2 AM does it for you.",
  },
];

// Spoken substitutions for the TTS voice (subtitles keep the written form).
export const say = [
  [/\bk8s-daily\b/g, "K eights daily"],
  [/\betcdctl\b/g, "etcd control"],
  [/\betcdutl\b/g, "etcd util"],
  [/\betcd\b/g, "etcd"],
  [/\bPVC\b/g, "P V C"],
  [/\bCSI\b/g, "C S I"],
  [/\bdataSource\b/g, "data source"],
  [/\bVolumeSnapshot\b/g, "Volume Snapshot"],
  [/\bpayments-data\b/g, "payments data"],
  [/\b2 AM\b/g, "Two A M"],
];
