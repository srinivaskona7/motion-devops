// Single source of truth for narration, subtitles and reveal timing.
// Every fact here is traced in videos/k8s-pod-scheduling/RESEARCH.md.
//
// Marker syntax inside narration:
//   [[id|Spoken words]]  the element #id reveals on the first spoken word
//   [[id]]               a timing mark on the next spoken word (no text)

export const meta = {
  slug: "k8s-pod-scheduling",
  title: "Kubernetes Pod Scheduling & Eviction",
  subtitle: "Where a Pod lands, and when it has to leave",
  accent: "#326ce5",
  wps: 2.15, // narration rate, words per second
  lead: 0.9, // entry seam before the first word of each scene
  pad: 1.4, // padding after the last word of each scene
  total: 180, // target runtime; the last scene holds to fill it
};

export const scenes = [
  {
    id: "s1",
    chapter: "Hook",
    narration:
      "You run [[s1-cmd|kubectl apply]], and a Pod named [[s1-pod|checkout]] is created. " +
      "The [[s1-api|API server]] saves it to [[s1-etcd|etcd]]. " +
      "Then it sits at [[s1-status|Pending]]: the object exists, but spec.nodeName is still empty. " +
      "Who chooses the machine? " +
      "The [[s1-sched|kube-scheduler]], which watches for unassigned Pods. " +
      "And when a node runs short of memory, the [[s1-kubelet|kubelet]] may take checkout away. " +
      "Let's follow both halves.",
  },
  {
    id: "s2",
    chapter: "Flow",
    narration:
      "Checkout enters the [[s2-queue|scheduling queue]], ordered by priority. " +
      "Then [[s2-filter|Filter]] checks every node. " +
      "[[s2-na|node-a]] has 300 millicores free; checkout requests 500, so node-a is [[s2-naout]]out. " +
      "[[s2-nb|node-b]] and [[s2-nc|node-c]] are feasible. " +
      "[[s2-score|Score]] ranks them: node-b 61, node-c 88. " +
      "[[s2-win]]Highest wins, ties break at random. " +
      "[[s2-rp]]Reserve and Permit then hold that choice, so no other Pod claims it. " +
      "[[s2-bind|Bind]] writes node-c into spec.nodeName, and the [[s2-kubelet|kubelet]] there starts the container. " +
      "Had no node passed Filter, [[s2-post|PostFilter]] would try preemption.",
  },
  {
    id: "s3",
    chapter: "Matrix",
    narration:
      "Three different forces can remove a Pod. " +
      "[[s3-c1|Preemption]]: the scheduler evicts lower-priority victims so a higher-priority Pod fits, and records the target in nominatedNodeName. " +
      "Victims get their [[s3-c1-grace]]grace period, 30 seconds by default, and [[s3-c1-pdb]]PodDisruptionBudgets are best effort. " +
      "[[s3-c2|Node-pressure eviction]]: the kubelet sees a signal, like [[s3-c2-trig]]memory.available under 100Mi. " +
      "It [[s3-c2-pdb]]ignores budgets, and a [[s3-c2-grace]]hard threshold means zero grace. " +
      "[[s3-c3|API-initiated eviction]], used by [[s3-c3-trig]]kubectl drain, [[s3-c3-pdb]]respects budgets and returns 429 when one would break.",
  },
  {
    id: "s4",
    chapter: "Edges",
    narration:
      "Four edge cases. " +
      "[[s4-e1|Eviction order]]: Pods using more than they request go first, by priority, then by how far over. " +
      "BestEffort Pods request nothing, so any usage counts as over. " +
      "[[s4-e1q]]QoS class is not the ranking key. " +
      "[[s4-e2|nominatedNodeName]] is a hint, not a reservation; [[s4-e2x]]a higher-priority Pod can take that node. " +
      "[[s4-e3|MemoryPressure]] becomes a [[s4-e3t]]NoSchedule taint, so new Pods stop landing there. " +
      "And the [[s4-e4|transition period]], five minutes by default, stops that condition from flapping.",
  },
  {
    id: "s5",
    chapter: "Recap",
    narration:
      "The whole loop: [[s5-q|Queue]], [[s5-f|Filter]], [[s5-s|Score]], [[s5-b|Bind]], [[s5-r|Running]]. " +
      "Then [[s5-p|Pressure]], and [[s5-e|Evicted]]: the Pod is marked Failed, and its [[s5-rs]]ReplicaSet creates a replacement that rejoins the queue. " +
      "Three habits keep you in control: [[s5-t1|set requests]], [[s5-t2|use a PriorityClass]], [[s5-t3|add a PodDisruptionBudget]]. " +
      "To watch both halves, read the events: [[s5-ev1]]FailedScheduling from the scheduler, [[s5-ev2]]Evicted from the kubelet. " +
      "[[s5-final]]The scheduler decides where a Pod lands. The kubelet decides when it leaves.",
  },
];

// Subtitle text stays technical; the Web Speech voice gets a speakable form.
export const say = [
  [/\bkubectl\b/g, "kube control"],
  [/\betcd\b/g, "E T C D"],
  [/spec\.nodeName/g, "spec dot node name"],
  [/memory\.available/g, "memory dot available"],
  [/\b100Mi\b/g, "100 mebibytes"],
  [/\b429\b/g, "four twenty-nine"],
  [/nominatedNodeName/g, "nominated node name"],
  [/PostFilter/g, "Post Filter"],
  [/PodDisruptionBudgets?/g, (m) => (m.endsWith("s") ? "Pod Disruption Budgets" : "Pod Disruption Budget")],
  [/PriorityClass/g, "Priority Class"],
  [/ReplicaSet/g, "Replica Set"],
  [/\bQoS\b/g, "Q o S"],
];
