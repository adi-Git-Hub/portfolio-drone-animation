const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const portfolio = {
  name: "Nikita Yende",
  photo: "/certificates/niki_pic.jpeg",
  role: "Computer Science & Engineering | AI & Data Science",
  email: "nikita.yende4@gmail.com",
  phone: "7038380876",
  linkedin: "https://linkedin.com/in/nikita-yende-677958288",
  github: "https://github.com/Nikitayende",
  summary:
    "M.Tech Computer Science and Engineering student with a B.Tech background in Artificial Intelligence and Data Science Engineering. Experienced in developing responsive web applications, database-driven architectures, and IoT robotics research. Passionate about turning complex logic into intuitive digital experiences.",
  stats: [
    { number: "02", label: "Featured Projects", icon: "⚡" },
    { number: "16+", label: "Tools & Technologies", icon: "⌘" },
    { number: "01", label: "Published IRJET Paper", icon: "⚛" },
    { number: "06", label: "Specialized Certifications", icon: "★" },
  ],
  skills: [
    { name: "Python", category: "Languages", level: 92, highlight: "Primary Language" },
    { name: "Java", category: "Languages", level: 80, highlight: "OOP & Systems" },
    { name: "C & C++", category: "Languages", level: 76, highlight: "Algorithms & Low-Level" },
    { name: "JavaScript", category: "Languages", level: 85, highlight: "Modern ES6+ & Three.js" },
    { name: "SQL", category: "Languages", level: 88, highlight: "Relational Queries" },
    { name: "HTML5 & CSS3", category: "Web", level: 94, highlight: "Responsive & Modern UI" },
    { name: "Flask", category: "Frameworks", level: 86, highlight: "Backend & Web APIs" },
    { name: "Bootstrap", category: "Frameworks", level: 82, highlight: "Grid Architecture" },
    { name: "SQLite", category: "Data", level: 84, highlight: "Database Design" },
    { name: "Pandas", category: "Data", level: 78, highlight: "Data Analysis" },
    { name: "OpenPyXL", category: "Data", level: 75, highlight: "Automation & Reports" },
    { name: "Chart.js", category: "Data", level: 80, highlight: "Data Visualization" },
    { name: "GitHub", category: "Tools", level: 85, highlight: "Version Control & Git" },
    { name: "VS Code", category: "Tools", level: 90, highlight: "Primary IDE" },
    { name: "CodeChef", category: "Tools", level: 78, highlight: "Problem Solving" },
    { name: "Microsoft Excel", category: "Tools", level: 86, highlight: "Data Modeling" },
  ],
  projects: [
    {
      number: "01",
      title: "Asset Inventory Management System",
      category: "Full Stack · Flask & SQL",
      badge: "Enterprise Tool",
      description:
        "A Flask-based web application developed for managing, tracking, and auditing IT assets. Built with SQLite to keep inventory information organized and enable quick multi-attribute lookups through an intuitive browser interface.",
      tags: ["Python", "Flask", "SQL", "SQLite", "HTML & CSS", "Chart.js"],
      metrics: ["Real-time Asset Tracking", "Audit Logs", "Responsive Dashboard"],
    },
    {
      number: "02",
      title: "Restaurant Website",
      category: "Responsive Frontend · Web Design",
      badge: "Responsive Web",
      description:
        "A modern, responsive restaurant front-end website built with clean semantic HTML, modular CSS, and JavaScript. Focused on appealing visual hierarchy, fluid layouts, and seamless usability across mobile, tablet, and desktop viewports.",
      tags: ["HTML5", "CSS3", "JavaScript", "Responsive Design", "UI/UX"],
      metrics: ["Mobile-First Layout", "Dynamic Menu UI", "Smooth Interaction"],
    },
  ],
  research: {
    title: "Intelligent IoT-Based Hand Gesture Controlled Robot",
    journal: "IRJET (International Research Journal of Engineering & Technology)",
    badge: "Published Research Paper",
    certificate: "/certificates/niki_irjet.jpeg",
    description:
      "Engineered an IoT-enabled robotic vehicle controlled intuitively via hand gestures using accelerometer/gyroscope sensors and real-time microcontroller signal transmission for remote exploration and accessibility.",
    tags: ["IoT Hardware", "Gesture Control", "Sensor Telemetry", "Embedded Robotics", "Wireless Pipeline"],
    impact: "Autonomous & Tele-operated Robotic Control via Human Motion Recognition",
  },
  experience: [
    {
      title: "IT Intern",
      organization: "Maharashtra Metro Rail Corporation Limited",
      location: "MAHA-Metro · Nagpur, India",
      period: "June 2026 – July 2026",
      description:
        "Gained hands-on industry exposure in metro transit IT infrastructure, database management systems, network monitoring, and enterprise software operations.",
      badge: "Industry Internship",
    },
  ],
  education: [
    {
      degree: "M.Tech · Computer Science & Engineering",
      institution: "G.H. Raisoni College of Engineering and Management, Nagpur",
      period: "2026 – 2028 (Currently Pursuing)",
      highlight: "Advanced Computer Science, Distributed Systems & Intelligent Computing",
    },
    {
      degree: "B.Tech · Artificial Intelligence & Data Science Engineering",
      institution: "K.D.K. College of Engineering, Nagpur · RTM Nagpur University",
      period: "Graduated 2026",
      highlight: "Machine Learning, Neural Networks, Big Data & Full Stack Architecture",
    },
    {
      degree: "Higher Secondary Certificate (HSC)",
      institution: "Kamla Nehru Mahavidyalaya, Nagpur · Maharashtra State Board",
      period: "2022",
      highlight: "Science & Mathematics Stream",
    },
  ],
  certifications: [
    {
      title: "Introduction to Machine Learning",
      issuer: "NPTEL · IIT Kharagpur",
      badge: "IIT Certified",
      image: "/certificates/niki_nptel_ml.jpeg",
      code: "IITK-ML-984",
      symbol: "ML",
      icon: "🧠",
    },
    {
      title: "Deep Learning",
      issuer: "NPTEL · IIT Ropar",
      badge: "IIT Certified",
      image: "/certificates/niki_nptel_dl.jpeg",
      code: "IITR-DL-412",
      symbol: "DL",
      icon: "⚡",
    },
    {
      title: "Data Science Specialization",
      issuer: "Infosys Springboard",
      badge: "Industry Leader",
      image: "/certificates/niki_skill_infosis.jpeg",
      code: "INFY-DS-882",
      symbol: "DS",
      icon: "📊",
    },
    {
      title: "Advanced Embedded Systems & Internet of Things",
      issuer: "Internship Training",
      badge: "IoT & Hardware",
      image: "/certificates/niki_IOT_Intern.jpeg",
      code: "EMB-IOT-605",
      symbol: "IoT",
      icon: "📡",
    },
    {
      title: "Salesforce Cloud & Ecosystem",
      issuer: "Training Internship",
      badge: "Enterprise CRM",
      image: "/certificates/niki_saleforce.jpeg",
      code: "SF-CRM-331",
      symbol: "CRM",
      icon: "☁️",
    },
    {
      title: "C & C++ Programming",
      issuer: "AICPE Certification",
      badge: "Systems Programming",
      image: "/certificates/niki_C_C++.jpeg",
      code: "AICPE-CP-118",
      symbol: "C++",
      icon: "⚙️",
    },
  ],
  highlights: [
    "Published research paper on an intelligent IoT-based hand gesture controlled robot · IRJET",
    "Presented Bank Management System paper · Spark-2025 National Conference",
    "Active participant in Tech-Aura 2025 Technical Competition",
  ],
};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/certificates", express.static(path.join(__dirname, "certificates")));
app.use("/vendor/three", express.static(path.join(__dirname, "node_modules", "three")));
app.use("/vendor/gsap", express.static(path.join(__dirname, "node_modules", "gsap")));

app.get("/", (_request, response) => {
  response.render("index", { portfolio });
});

app.get("/download-resume", (_request, response) => {
  const resumePath = path.join(__dirname, "Nikita_Resume.pdf");
  response.download(resumePath, "Nikita_Yende_Resume.pdf", (err) => {
    if (err) {
      console.error("Resume download error:", err);
      if (!response.headersSent) {
        response.status(404).send("Resume file not found");
      }
    }
  });
});

app.get("/download-certificate/:file", (request, response) => {
  const safeFile = path.basename(request.params.file);
  const certPath = path.join(__dirname, "certificates", safeFile);
  response.download(certPath, safeFile, (err) => {
    if (err) {
      console.error("Certificate download error:", err);
      if (!response.headersSent) {
        response.status(404).send("Certificate file not found");
      }
    }
  });
});

app.use((request, response) => {
  response.status(404).send("Page not found");
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Portfolio running at http://localhost:${port}`);
  });
}

module.exports = { app, portfolio };
