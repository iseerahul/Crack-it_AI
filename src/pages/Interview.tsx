import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Timer,
  BarChart2,
  BrainCircuit,
  User,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Mic,
  MicOff,
  Download,
  History
} from 'lucide-react';
import { CameraPreview } from '@/components/interview/CameraPreview';
import { generateQuestion, evaluateAnswer, speak, InterviewQuestion, EvaluationResult, InterviewReport } from '@/lib/gemini';
import { cn } from '@/lib/utils';
import Markdown from 'react-markdown';
import stringSimilarity from 'string-similarity';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'sort of', 'kind of', 'literally', 'I mean', 'well'];

const SYNONYMS: Record<string, string[]> = {
  "hook": ["function", "api", "feature"],
  "state": ["data", "variables", "values"],
  "component": ["module", "part", "element"],
  "render": ["display", "show", "paint"],
  "performance": ["speed", "efficiency", "optimization"],
  "asynchronous": ["non-blocking", "background", "promise"],
  "immutable": ["unchangeable", "constant", "fixed"],
  "encapsulation": ["hiding", "isolation", "wrapping"]
};

const FEEDBACK_TEMPLATES = {
  high: [
    "Excellent articulation of the core concepts. Your explanation was clear and technically accurate.",
    "Impressive depth of knowledge. You covered the key aspects with great precision.",
    "Very strong response. You demonstrated a solid grasp of the underlying principles.",
    "Outstanding clarity. Your technical depth is evident in how you structured your explanation.",
    "Superb answer. You effectively communicated complex ideas with ease and accuracy."
  ],
  medium: [
    "Good effort, but you could be more specific about the implementation details.",
    "You touched on the main points, but missed some critical nuances of the topic.",
    "A solid start, but try to provide more practical examples to support your answer.",
    "Fairly accurate, but your delivery could be more concise and focused on the core problem.",
    "You have the right idea, but consider refining your technical terminology for better impact."
  ],
  low: [
    "The answer was a bit vague. Try to focus more on the technical specifics of the question.",
    "You missed several key components of the expected answer. More review is recommended.",
    "The response lacked depth. Focus on understanding the fundamental concepts better.",
    "Consider revisiting the basics of this topic. Your answer was missing some foundational elements.",
    "Try to structure your thoughts more clearly. The technical accuracy was below the expected threshold."
  ],
  none: [
    "The response did not match the expected technical criteria. Please review the core concepts of this topic.",
    "No significant overlap with the expected answer was detected. Focus on learning the fundamental terminology.",
    "The answer provided was either too brief or off-topic. Try to provide a more detailed technical explanation."
  ]
};

const DOMAIN_QUESTIONS: Record<string, InterviewQuestion[]> = {
  "Web Development": [
    { question: "Explain the difference between functional and class components in React.", difficulty: "medium", topic: "React Fundamentals", expected_answer: "Functional components are simpler, use hooks for state/lifecycle, and are generally preferred. Class components use ES6 classes and lifecycle methods like componentDidMount." },
    { question: "How does the Virtual DOM work?", difficulty: "medium", topic: "React Internals", expected_answer: "React creates a lightweight copy of the real DOM. When state changes, it compares the new Virtual DOM with the old one (diffing) and updates only the changed parts in the real DOM." },
    { question: "What are the benefits of using TypeScript over JavaScript?", difficulty: "medium", topic: "TypeScript", expected_answer: "Static typing, better IDE support, early error detection, and improved code maintainability/readability." },
    { question: "Explain the concept of 'lifting state up' in React.", difficulty: "medium", topic: "State Management", expected_answer: "Moving state to the closest common ancestor of components that need to share that state, ensuring a single source of truth." },
    { question: "What is the purpose of the 'useEffect' hook?", difficulty: "medium", topic: "React Hooks", expected_answer: "To perform side effects in functional components, such as data fetching, subscriptions, or manually changing the DOM." },
    { question: "What is CSS-in-JS and what are its pros and cons?", difficulty: "medium", topic: "Styling", expected_answer: "A technique where CSS is composed using JavaScript. Pros include scoped styles and dynamic styling; cons include runtime overhead and larger bundle sizes." },
    { question: "Explain the concept of 'closures' in JavaScript.", difficulty: "hard", topic: "JavaScript", expected_answer: "A closure is the combination of a function bundled together with references to its surrounding state (the lexical environment)." },
    { question: "What is the difference between '==' and '===' in JavaScript?", difficulty: "easy", topic: "JavaScript", expected_answer: "== performs type coercion before comparison, while === checks for both value and type equality." },
    { question: "What is the 'this' keyword in JavaScript?", difficulty: "medium", topic: "JavaScript", expected_answer: "It refers to the object that is executing the current function, its value depends on how the function is called." },
    { question: "Explain the difference between 'let', 'const', and 'var'.", difficulty: "easy", topic: "JavaScript", expected_answer: "var is function-scoped, while let and const are block-scoped. const cannot be reassigned." },
    { question: "What is a Promise in JavaScript?", difficulty: "medium", topic: "JavaScript", expected_answer: "An object representing the eventual completion or failure of an asynchronous operation." },
    { question: "Explain async/await in JavaScript.", difficulty: "medium", topic: "JavaScript", expected_answer: "Syntactic sugar built on top of Promises, making asynchronous code look and behave more like synchronous code." },
    { question: "What is the purpose of the 'key' prop in React lists?", difficulty: "medium", topic: "React Fundamentals", expected_answer: "To help React identify which items have changed, been added, or removed, improving rendering performance." },
    { question: "What are React Fragments?", difficulty: "easy", topic: "React Fundamentals", expected_answer: "A way to group a list of children without adding extra nodes to the DOM." },
    { question: "What is the Context API in React?", difficulty: "medium", topic: "State Management", expected_answer: "A way to share values like themes or user data between components without having to explicitly pass props through every level." },
    { question: "What is Redux and when should you use it?", difficulty: "hard", topic: "State Management", expected_answer: "A predictable state container for JavaScript apps. Use it for complex state that needs to be accessed by many components." },
    { question: "Explain the concept of 'Higher-Order Components' (HOC).", difficulty: "hard", topic: "React Patterns", expected_answer: "A function that takes a component and returns a new component, used for reusing component logic." },
    { question: "What are React Hooks?", difficulty: "medium", topic: "React Hooks", expected_answer: "Functions that let you 'hook into' React state and lifecycle features from functional components." },
    { question: "What is the difference between 'useMemo' and 'useCallback'?", difficulty: "hard", topic: "React Hooks", expected_answer: "useMemo returns a memoized value, while useCallback returns a memoized callback function." },
    { question: "What is the purpose of 'useRef'?", difficulty: "medium", topic: "React Hooks", expected_answer: "To create a mutable reference that persists across renders, often used to access DOM elements directly." },
    { question: "Explain the concept of 'Server-Side Rendering' (SSR).", difficulty: "hard", topic: "Web Architecture", expected_answer: "Rendering a web page on the server instead of the browser, improving SEO and initial load time." },
    { question: "What is 'Static Site Generation' (SSG)?", difficulty: "hard", topic: "Web Architecture", expected_answer: "Generating the entire website as static HTML files at build time." },
    { question: "What is the difference between 'localStorage' and 'sessionStorage'?", difficulty: "easy", topic: "Web Storage", expected_answer: "localStorage persists even after the browser is closed, while sessionStorage is cleared when the tab is closed." },
    { question: "What are 'cookies' and how are they used?", difficulty: "medium", topic: "Web Storage", expected_answer: "Small pieces of data stored on the client-side, often used for authentication and tracking." },
    { question: "Explain the 'Box Model' in CSS.", difficulty: "easy", topic: "CSS", expected_answer: "The representation of every element as a rectangular box consisting of content, padding, border, and margin." },
    { question: "What is 'Flexbox' and how does it work?", difficulty: "medium", topic: "CSS", expected_answer: "A layout model that allows elements to be aligned and distributed within a container, even when their size is unknown." },
    { question: "What is 'CSS Grid'?", difficulty: "medium", topic: "CSS", expected_answer: "A two-dimensional layout system for the web, allowing for complex grid-based designs." },
    { question: "Explain the concept of 'Responsive Design'.", difficulty: "easy", topic: "Web Design", expected_answer: "Designing websites that adapt to different screen sizes and devices." },
    { question: "What is 'Media Queries' in CSS?", difficulty: "easy", topic: "CSS", expected_answer: "A way to apply different styles based on the device's characteristics, such as screen width." },
    { question: "What is 'SASS' or 'SCSS'?", difficulty: "medium", topic: "CSS Preprocessors", expected_answer: "A CSS preprocessor that adds features like variables, nesting, and mixins to standard CSS." },
    { question: "Explain the 'Event Loop' in JavaScript.", difficulty: "hard", topic: "JavaScript Internals", expected_answer: "The mechanism that allows JavaScript to perform non-blocking I/O operations by offloading tasks to the system kernel." },
    { question: "What is 'Debouncing' and 'Throttling'?", difficulty: "hard", topic: "Performance", expected_answer: "Techniques to limit the rate at which a function is executed, often used for scroll or resize events." },
    { question: "What is 'Lazy Loading'?", difficulty: "medium", topic: "Performance", expected_answer: "A technique that defers the loading of non-critical resources until they are needed." },
    { question: "Explain the concept of 'Progressive Web Apps' (PWA).", difficulty: "hard", topic: "Web Apps", expected_answer: "Web apps that use modern web capabilities to provide an app-like experience to users." },
    { question: "What is 'WebSockets'?", difficulty: "medium", topic: "Networking", expected_answer: "A protocol that provides full-duplex communication channels over a single TCP connection." },
    { question: "What is 'REST API'?", difficulty: "medium", topic: "Web Services", expected_answer: "An architectural style for designing networked applications, using standard HTTP methods." },
    { question: "What is 'GraphQL' and how does it differ from REST?", difficulty: "hard", topic: "Web Services", expected_answer: "A query language for APIs that allows clients to request exactly the data they need." },
    { question: "Explain the concept of 'Cross-Origin Resource Sharing' (CORS).", difficulty: "hard", topic: "Security", expected_answer: "A security feature that allows or restricts resources on a web page to be requested from another domain." },
    { question: "What is 'JSON Web Token' (JWT)?", difficulty: "medium", topic: "Security", expected_answer: "A compact, URL-safe means of representing claims to be transferred between two parties." },
    { question: "What is 'OAuth'?", difficulty: "hard", topic: "Security", expected_answer: "An open standard for access delegation, commonly used for token-based authentication." },
    { question: "What is 'Web Workers'?", difficulty: "hard", topic: "Performance", expected_answer: "A way to run scripts in background threads, allowing for heavy computations without blocking the UI." },
    { question: "Explain the 'Shadow DOM'.", difficulty: "hard", topic: "Web Components", expected_answer: "A scoped sub-tree of the DOM that is isolated from the rest of the document, used in Web Components." }
  ],
  "Data Science": [
    { question: "What is the difference between supervised and unsupervised learning?", difficulty: "medium", topic: "Machine Learning", expected_answer: "Supervised learning uses labeled data to train models, while unsupervised learning finds patterns in unlabeled data." },
    { question: "Explain the concept of overfitting and how to prevent it.", difficulty: "medium", topic: "Model Training", expected_answer: "Overfitting occurs when a model learns noise in the training data too well. Prevent it using regularization, cross-validation, or more data." },
    { question: "What is a confusion matrix?", difficulty: "medium", topic: "Evaluation Metrics", expected_answer: "A table used to evaluate the performance of a classification model, showing true positives, true negatives, false positives, and false negatives." },
    { question: "How do you handle missing data in a dataset?", difficulty: "medium", topic: "Data Preprocessing", expected_answer: "By removing rows/columns, imputing values (mean/median/mode), or using algorithms that handle missing data natively." },
    { question: "Explain the bias-variance tradeoff.", difficulty: "medium", topic: "Model Theory", expected_answer: "The balance between a model's complexity (variance) and its assumptions (bias) to minimize total error." },
    { question: "What is Principal Component Analysis (PCA)?", difficulty: "hard", topic: "Dimensionality Reduction", expected_answer: "A technique used to emphasize variation and bring out strong patterns in a dataset by reducing dimensions while preserving variance." },
    { question: "Explain the difference between L1 and L2 regularization.", difficulty: "hard", topic: "Regularization", expected_answer: "L1 (Lasso) adds absolute value of coefficients as penalty and can lead to sparse features. L2 (Ridge) adds squared magnitude and prevents large weights." },
    { question: "What is a p-value in statistics?", difficulty: "medium", topic: "Statistics", expected_answer: "The probability of obtaining test results at least as extreme as the results actually observed, assuming the null hypothesis is correct." },
    { question: "Explain the difference between Type I and Type II errors.", difficulty: "medium", topic: "Statistics", expected_answer: "Type I is a false positive (rejecting a true null hypothesis), while Type II is a false negative (failing to reject a false null hypothesis)." },
    { question: "What is the Central Limit Theorem?", difficulty: "hard", topic: "Statistics", expected_answer: "The theory that the distribution of sample means will be approximately normal, regardless of the population's distribution, given a large enough sample size." },
    { question: "What is 'Data Normalization' and why is it important?", difficulty: "medium", topic: "Data Preprocessing", expected_answer: "Scaling data to a standard range (e.g., 0 to 1) to ensure that features contribute equally to the model's performance." },
    { question: "Explain the concept of 'Feature Engineering'.", difficulty: "medium", topic: "Data Preprocessing", expected_answer: "The process of using domain knowledge to create new features from raw data to improve model performance." },
    { question: "What is 'Cross-Validation'?", difficulty: "medium", topic: "Model Evaluation", expected_answer: "A technique for assessing how the results of a statistical analysis will generalize to an independent dataset." },
    { question: "What is a 'Random Forest'?", difficulty: "medium", topic: "Machine Learning", expected_answer: "An ensemble learning method that constructs multiple decision trees and outputs the class that is the mode of the classes." },
    { question: "Explain 'Gradient Boosting'.", difficulty: "hard", topic: "Machine Learning", expected_answer: "A technique that builds models sequentially, with each new model attempting to correct the errors of the previous ones." },
    { question: "What is 'Support Vector Machine' (SVM)?", difficulty: "hard", topic: "Machine Learning", expected_answer: "A supervised learning model that finds the hyperplane that best separates different classes in the feature space." },
    { question: "What is 'K-Means Clustering'?", difficulty: "medium", topic: "Unsupervised Learning", expected_answer: "An algorithm that partitions data into K distinct clusters based on feature similarity." },
    { question: "Explain 'Hierarchical Clustering'.", difficulty: "hard", topic: "Unsupervised Learning", expected_answer: "A method of cluster analysis which seeks to build a hierarchy of clusters." },
    { question: "What is 'Natural Language Processing' (NLP)?", difficulty: "medium", topic: "AI Applications", expected_answer: "A field of AI that focuses on the interaction between computers and human language." },
    { question: "What is 'Sentiment Analysis'?", difficulty: "medium", topic: "NLP", expected_answer: "The use of NLP to identify and extract subjective information from source materials." },
    { question: "What is 'Term Frequency-Inverse Document Frequency' (TF-IDF)?", difficulty: "hard", topic: "NLP", expected_answer: "A numerical statistic that reflects how important a word is to a document in a collection or corpus." },
    { question: "Explain 'Word Embeddings'.", difficulty: "hard", topic: "NLP", expected_answer: "A type of word representation that allows words with similar meaning to have a similar representation." },
    { question: "What is a 'Neural Network'?", difficulty: "medium", topic: "Deep Learning", expected_answer: "A series of algorithms that mimic the human brain to recognize patterns." },
    { question: "What is 'Backpropagation'?", difficulty: "hard", topic: "Deep Learning", expected_answer: "The primary algorithm used for training neural networks by calculating the gradient of the loss function." },
    { question: "Explain 'Convolutional Neural Networks' (CNN).", difficulty: "hard", topic: "Deep Learning", expected_answer: "A class of deep neural networks most commonly applied to analyzing visual imagery." },
    { question: "What is 'Recurrent Neural Networks' (RNN)?", difficulty: "hard", topic: "Deep Learning", expected_answer: "A class of neural networks where connections between nodes form a directed graph along a temporal sequence." },
    { question: "What is 'Transfer Learning'?", difficulty: "medium", topic: "Deep Learning", expected_answer: "A research problem in machine learning that focuses on storing knowledge gained while solving one problem and applying it to a different but related problem." },
    { question: "What is 'Reinforcement Learning'?", difficulty: "hard", topic: "Machine Learning", expected_answer: "An area of machine learning concerned with how intelligent agents ought to take actions in an environment to maximize cumulative reward." },
    { question: "What is 'A/B Testing'?", difficulty: "medium", topic: "Statistics", expected_answer: "A randomized experimentation process wherein two or more versions of a variable are shown to different segments of website visitors at the same time." },
    { question: "Explain 'Correlation' vs 'Causation'.", difficulty: "easy", topic: "Statistics", expected_answer: "Correlation is a relationship between two variables, while causation means one variable directly causes the other to change." },
    { question: "What is 'Hypothesis Testing'?", difficulty: "medium", topic: "Statistics", expected_answer: "A statistical method that is used in making statistical decisions using experimental data." },
    { question: "What is 'Standard Deviation'?", difficulty: "easy", topic: "Statistics", expected_answer: "A measure of the amount of variation or dispersion of a set of values." },
    { question: "What is 'Normal Distribution'?", difficulty: "easy", topic: "Statistics", expected_answer: "A probability distribution that is symmetric about the mean, showing that data near the mean are more frequent in occurrence than data far from the mean." },
    { question: "Explain 'Linear Regression'.", difficulty: "medium", topic: "Machine Learning", expected_answer: "A linear approach for modelling the relationship between a scalar response and one or more explanatory variables." },
    { question: "Explain 'Logistic Regression'.", difficulty: "medium", topic: "Machine Learning", expected_answer: "A statistical model that uses a logistic function to model a binary dependent variable." },
    { question: "What is 'Decision Tree'?", difficulty: "medium", topic: "Machine Learning", expected_answer: "A flowchart-like structure in which each internal node represents a 'test' on an attribute." },
    { question: "What is 'Ensemble Learning'?", difficulty: "hard", topic: "Machine Learning", expected_answer: "The process by which multiple models are strategically generated and combined to solve a particular computational intelligence problem." },
    { question: "What is 'Data Wrangling'?", difficulty: "medium", topic: "Data Preprocessing", expected_answer: "The process of transforming and mapping data from one 'raw' data form into another format with the intent of making it more appropriate and valuable." },
    { question: "What is 'Exploratory Data Analysis' (EDA)?", difficulty: "medium", topic: "Data Analysis", expected_answer: "An approach to analyzing data sets to summarize their main characteristics, often with visual methods." },
    { question: "What is 'Big Data'?", difficulty: "medium", topic: "Data Science", expected_answer: "Extremely large data sets that may be analyzed computationally to reveal patterns, trends, and associations." },
    { question: "What is 'Deep Q-Learning'?", difficulty: "hard", topic: "Reinforcement Learning", expected_answer: "A reinforcement learning technique that combines Q-Learning with deep neural networks." },
    { question: "Explain 'Generative Adversarial Networks' (GANs).", difficulty: "hard", topic: "Deep Learning", expected_answer: "A class of machine learning frameworks where two neural networks contest with each other in a game." }
  ],
  "DevOps": [
    { question: "What is CI/CD and why is it important?", difficulty: "medium", topic: "Automation", expected_answer: "Continuous Integration and Continuous Deployment automate the building, testing, and deployment of code, leading to faster and more reliable releases." },
    { question: "Explain the concept of Infrastructure as Code (IaC).", difficulty: "medium", topic: "Infrastructure", expected_answer: "Managing and provisioning infrastructure through machine-readable definition files rather than manual processes." },
    { question: "What is Docker and how does it differ from a Virtual Machine?", difficulty: "medium", topic: "Containerization", expected_answer: "Docker containers share the host OS kernel and are lightweight, while VMs include a full guest OS and are more resource-heavy." },
    { question: "How do you handle secrets management in a CI/CD pipeline?", difficulty: "medium", topic: "Security", expected_answer: "Using dedicated tools like HashiCorp Vault, AWS Secrets Manager, or built-in CI/CD secret variables." },
    { question: "What is Kubernetes and what are its core components?", difficulty: "medium", topic: "Orchestration", expected_answer: "An open-source system for automating deployment, scaling, and management of containerized applications. Core components include pods, nodes, and clusters." },
    { question: "Explain the concept of 'GitOps'.", difficulty: "hard", topic: "Methodology", expected_answer: "A way of implementing Continuous Deployment for cloud native applications, using Git as a single source of truth for declarative infrastructure and applications." },
    { question: "What is the difference between a 'Rolling Update' and a 'Blue-Green Deployment'?", difficulty: "hard", topic: "Deployment Strategies", expected_answer: "Rolling update replaces instances gradually, while blue-green has two identical environments and switches traffic between them." },
    { question: "What is 'Monitoring' vs 'Observability'?", difficulty: "medium", topic: "Operations", expected_answer: "Monitoring tells you when something is wrong; observability helps you understand why it's wrong by looking at logs, metrics, and traces." },
    { question: "What is 'Terraform' and how does it manage state?", difficulty: "medium", topic: "IaC", expected_answer: "An IaC tool that uses a state file to keep track of the resources it manages and their current configuration." },
    { question: "Explain the concept of 'Microservices' architecture.", difficulty: "medium", topic: "Architecture", expected_answer: "An architectural style that structures an application as a collection of small, autonomous services modeled around a business domain." },
    { question: "What is 'Ansible' and how does it differ from Terraform?", difficulty: "medium", topic: "Configuration Management", expected_answer: "Ansible is primarily for configuration management (software), while Terraform is for infrastructure provisioning (hardware/cloud resources)." },
    { question: "Explain 'Chaos Engineering'.", difficulty: "hard", topic: "Reliability", expected_answer: "The discipline of experimenting on a software system in production in order to build confidence in the system's capability to withstand turbulent and unexpected conditions." },
    { question: "What is 'Site Reliability Engineering' (SRE)?", difficulty: "medium", topic: "Operations", expected_answer: "A discipline that incorporates aspects of software engineering and applies them to infrastructure and operations problems." },
    { question: "What is a 'Service Mesh'?", difficulty: "hard", topic: "Networking", expected_answer: "A dedicated infrastructure layer for facilitating service-to-service communications between services, often using a sidecar proxy." },
    { question: "Explain 'DevSecOps'.", difficulty: "medium", topic: "Security", expected_answer: "The practice of integrating security into every stage of the DevOps lifecycle." },
    { question: "What is 'Canary Deployment'?", difficulty: "medium", topic: "Deployment Strategies", expected_answer: "A deployment strategy where a new version of software is rolled out to a small subset of users before being deployed to the entire infrastructure." },
    { question: "Explain 'Infrastructure Drift'.", difficulty: "medium", topic: "IaC", expected_answer: "When the actual state of infrastructure deviates from the desired state defined in configuration files." },
    { question: "What is 'Immutable Infrastructure'?", difficulty: "hard", topic: "Infrastructure", expected_answer: "An approach where servers are never modified after deployment; instead, they are replaced with new instances from a common image." },
    { question: "What is 'Helm' in Kubernetes?", difficulty: "medium", topic: "Orchestration", expected_answer: "A package manager for Kubernetes that helps you define, install, and upgrade complex Kubernetes applications." },
    { question: "Explain 'Service Level Indicators' (SLI) vs 'Service Level Objectives' (SLO).", difficulty: "hard", topic: "Reliability", expected_answer: "SLIs are specific metrics (like latency), while SLOs are target values for those metrics (like 99.9% of requests under 200ms)." },
    { question: "What is 'Prometheus' used for?", difficulty: "medium", topic: "Operations", expected_answer: "An open-source monitoring and alerting toolkit designed for reliability and scalability." },
    { question: "Explain 'Log Aggregation'.", difficulty: "medium", topic: "Operations", expected_answer: "The process of collecting logs from multiple sources and centralizing them for easier analysis and troubleshooting." },
    { question: "What is 'Sidecar Pattern'?", difficulty: "hard", topic: "Architecture", expected_answer: "A design pattern where a helper container is deployed alongside the main application container to provide additional functionality like logging or proxying." },
    { question: "What is 'VPC Peering'?", difficulty: "medium", topic: "Networking", expected_answer: "A networking connection between two VPCs that enables you to route traffic between them using private IP addresses." },
    { question: "Explain 'Load Balancing' algorithms.", difficulty: "medium", topic: "Networking", expected_answer: "Methods like Round Robin, Least Connections, and IP Hash used to distribute incoming traffic across multiple servers." },
    { question: "What is 'Sticky Sessions'?", difficulty: "medium", topic: "Networking", expected_answer: "A mechanism that ensures all requests from a specific user are routed to the same server for the duration of their session." },
    { question: "What is 'RTO' and 'RPO'?", difficulty: "hard", topic: "Reliability", expected_answer: "Recovery Time Objective (how fast you recover) and Recovery Point Objective (how much data you can afford to lose)." },
    { question: "What is 'Secret Rotation'?", difficulty: "medium", topic: "Security", expected_answer: "The practice of periodically changing passwords, API keys, and other credentials to minimize the impact of a potential leak." },
    { question: "Explain 'Container Registry'.", difficulty: "easy", topic: "Containerization", expected_answer: "A repository for storing and managing container images, such as Docker Hub or AWS ECR." },
    { question: "What is 'Orchestration' vs 'Choreography'?", difficulty: "hard", topic: "Architecture", expected_answer: "Orchestration is centralized control of services, while choreography is decentralized coordination where each service knows its role." },
    { question: "What is 'Serverless Framework'?", difficulty: "medium", topic: "Automation", expected_answer: "A tool that simplifies the deployment and management of serverless applications across different cloud providers." },
    { question: "Explain 'Webhooks'.", difficulty: "easy", topic: "Automation", expected_answer: "Automated messages sent from apps when something happens, used to trigger actions in other systems." },
    { question: "What is 'Semantic Versioning' (SemVer)?", difficulty: "easy", topic: "Automation", expected_answer: "A versioning scheme (Major.Minor.Patch) that conveys meaning about the underlying changes in a release." },
    { question: "What is 'Dark Launching'?", difficulty: "hard", topic: "Deployment Strategies", expected_answer: "Releasing a feature to production but keeping it hidden from users to test its performance and stability under real load." },
    { question: "Explain 'Infrastructure as a Service' (IaaS) vs 'Platform as a Service' (PaaS).", difficulty: "medium", topic: "Cloud Models", expected_answer: "IaaS gives you the raw infrastructure (VMs), while PaaS provides a managed platform for running applications." }
  ],
  "Cybersecurity": [
    { question: "What is the difference between symmetric and asymmetric encryption?", difficulty: "medium", topic: "Cryptography", expected_answer: "Symmetric uses one key for both encryption and decryption, while asymmetric uses a public key for encryption and a private key for decryption." },
    { question: "Explain the concept of 'Zero Trust' security.", difficulty: "medium", topic: "Security Architecture", expected_answer: "A security framework requiring all users, whether in or out of the network, to be authenticated and authorized before being granted access." },
    { question: "What is a SQL injection attack and how can it be prevented?", difficulty: "medium", topic: "Web Security", expected_answer: "An attack where malicious SQL statements are inserted into entry fields. Prevent it using prepared statements and parameterized queries." },
    { question: "What is the purpose of a firewall?", difficulty: "medium", topic: "Network Security", expected_answer: "To monitor and control incoming and outgoing network traffic based on predetermined security rules." },
    { question: "Explain the difference between a vulnerability scan and a penetration test.", difficulty: "medium", topic: "Security Testing", expected_answer: "A vulnerability scan is automated and identifies known weaknesses, while a penetration test is a manual, simulated attack to find and exploit vulnerabilities." },
    { question: "What is 'Phishing' and how can users protect themselves?", difficulty: "easy", topic: "Social Engineering", expected_answer: "A fraudulent attempt to obtain sensitive information by disguising as a trustworthy entity. Protection includes checking sender addresses and avoiding suspicious links." },
    { question: "What is 'Multi-Factor Authentication' (MFA)?", difficulty: "easy", topic: "Authentication", expected_answer: "A security system that requires more than one method of authentication from independent categories of credentials to verify the user's identity." },
    { question: "Explain the concept of 'Least Privilege'.", difficulty: "medium", topic: "Access Control", expected_answer: "The principle of providing users with only the minimum levels of access or permissions needed to perform their job functions." },
    { question: "What is a 'DDoS' attack?", difficulty: "medium", topic: "Network Security", expected_answer: "A Distributed Denial-of-Service attack attempts to make an online service unavailable by overwhelming it with traffic from multiple sources." },
    { question: "What is 'Cross-Site Scripting' (XSS)?", difficulty: "hard", topic: "Web Security", expected_answer: "A type of security vulnerability where an attacker injects malicious scripts into content from otherwise trusted websites." },
    { question: "What is 'Ransomware'?", difficulty: "medium", topic: "Malware", expected_answer: "A type of malicious software designed to block access to a computer system until a sum of money is paid." },
    { question: "Explain 'Endpoint Detection and Response' (EDR).", difficulty: "hard", topic: "Security Operations", expected_answer: "A technology that continually monitors and responds to mitigate cyber threats on endpoints." },
    { question: "What is a 'Honey Pot'?", difficulty: "medium", topic: "Security Strategy", expected_answer: "A decoy computer system used to trap hackers or track unconventional hacking methods." },
    { question: "Explain 'Social Engineering'.", difficulty: "medium", topic: "Security Concepts", expected_answer: "The psychological manipulation of people into performing actions or divulging confidential information." },
    { question: "What is 'OWASP Top 10'?", difficulty: "medium", topic: "Web Security", expected_answer: "A standard awareness document for developers and web application security, representing a broad consensus about the most critical security risks to web applications." },
    { question: "What is 'Cross-Site Request Forgery' (CSRF)?", difficulty: "hard", topic: "Web Security", expected_answer: "An attack that forces an authenticated user to execute unwanted actions on a web application in which they are currently authenticated." },
    { question: "Explain 'Man-in-the-Middle' (MitM) attack.", difficulty: "medium", topic: "Network Security", expected_answer: "An attack where the attacker secretly relays and possibly alters the communications between two parties who believe they are directly communicating with each other." },
    { question: "What is 'Brute Force' attack?", difficulty: "easy", topic: "Authentication", expected_answer: "A trial-and-error method used to obtain information such as a user password or personal identification number." },
    { question: "What is 'Salting' in hashing?", difficulty: "medium", topic: "Cryptography", expected_answer: "Adding random data to a password before hashing it to protect against rainbow table attacks." },
    { question: "Explain 'Public Key Infrastructure' (PKI).", difficulty: "hard", topic: "Cryptography", expected_answer: "A set of roles, policies, hardware, software and procedures needed to create, manage, distribute, use, store and revoke digital certificates." },
    { question: "What is 'Transport Layer Security' (TLS)?", difficulty: "medium", topic: "Network Security", expected_answer: "A cryptographic protocol designed to provide communications security over a computer network." },
    { question: "What is 'Intrusion Detection System' (IDS) vs 'Intrusion Prevention System' (IPS)?", difficulty: "medium", topic: "Network Security", expected_answer: "IDS monitors network traffic for suspicious activity and alerts, while IPS also takes action to block or prevent the activity." },
    { question: "Explain 'Sandboxing'.", difficulty: "medium", topic: "Security Concepts", expected_answer: "A security mechanism for separating running programs, usually in an effort to mitigate system failures or software vulnerabilities from spreading." },
    { question: "What is 'Buffer Overflow'?", difficulty: "hard", topic: "Security Vulnerabilities", expected_answer: "An anomaly where a program, while writing data to a buffer, overruns the buffer's boundary and overwrites adjacent memory locations." },
    { question: "What is 'Cross-Site Script Inclusion' (XSSI)?", difficulty: "hard", topic: "Web Security", expected_answer: "A vulnerability that allows an attacker to read data from a different origin by including a script from that origin." },
    { question: "Explain 'Security Headers' (e.g., CSP, HSTS).", difficulty: "medium", topic: "Web Security", expected_answer: "HTTP response headers that tell the browser how to behave to improve the security of the web application." },
    { question: "What is 'Red Teaming' vs 'Blue Teaming'?", difficulty: "medium", topic: "Security Testing", expected_answer: "Red team acts as the attacker to find vulnerabilities, while blue team acts as the defender to protect the infrastructure." },
    { question: "What is 'Zero-Day' vulnerability?", difficulty: "hard", topic: "Security Vulnerabilities", expected_answer: "A software vulnerability that is unknown to those who should be interested in mitigating it, including the vendor." },
    { question: "What is 'CVE' (Common Vulnerabilities and Exposures)?", difficulty: "easy", topic: "Security Concepts", expected_answer: "A list of publicly disclosed computer security flaws, each assigned a unique identification number." },
    { question: "Explain 'Identity and Access Management' (IAM).", difficulty: "medium", topic: "Access Control", expected_answer: "A framework of policies and technologies for ensuring that the right users have the appropriate access to technology resources." },
    { question: "What is 'Data Loss Prevention' (DLP)?", difficulty: "medium", topic: "Security Strategy", expected_answer: "A set of tools and processes used to ensure that sensitive data is not lost, misused, or accessed by unauthorized users." },
    { question: "Explain 'Security Information and Event Management' (SIEM).", difficulty: "hard", topic: "Security Operations", expected_answer: "A field within the field of computer security, where software products and services combine security information management and security event management." },
    { question: "What is 'Penetration Testing' methodology?", difficulty: "medium", topic: "Security Testing", expected_answer: "A structured approach to testing security, often including phases like reconnaissance, scanning, exploitation, and reporting." },
    { question: "What is 'Air Gapping'?", difficulty: "hard", topic: "Security Architecture", expected_answer: "A network security measure employed on one or more computers to ensure that a secure computer network is physically isolated from unsecured networks." }
  ],
  "Cloud Computing": [
    { question: "What are the main differences between IaaS, PaaS, and SaaS?", difficulty: "medium", topic: "Cloud Models", expected_answer: "IaaS provides infrastructure (VMs), PaaS provides a platform for development, and SaaS provides software over the internet." },
    { question: "Explain the concept of serverless computing.", difficulty: "medium", topic: "Cloud Architecture", expected_answer: "A cloud execution model where the provider manages the server infrastructure, and users pay only for the resources consumed by their code." },
    { question: "What is a Content Delivery Network (CDN)?", difficulty: "medium", topic: "Networking", expected_answer: "A geographically distributed group of servers that work together to provide fast delivery of internet content." },
    { question: "How do you ensure high availability in a cloud environment?", difficulty: "medium", topic: "Reliability", expected_answer: "By using multi-region deployments, load balancers, and auto-scaling groups." },
    { question: "What are the benefits of using a multi-cloud strategy?", difficulty: "medium", topic: "Cloud Strategy", expected_answer: "Avoiding vendor lock-in, improving disaster recovery, and optimizing costs/performance by using the best services from each provider." },
    { question: "What is 'Auto-scaling'?", difficulty: "medium", topic: "Cloud Operations", expected_answer: "A method used in cloud computing that automatically adjusts the amount of computational resources in a server farm based on the load." },
    { question: "Explain the concept of 'Cloud Native'.", difficulty: "hard", topic: "Cloud Strategy", expected_answer: "An approach to building and running applications that exploits the advantages of the cloud computing delivery model." },
    { question: "What is 'Object Storage' vs 'Block Storage'?", difficulty: "hard", topic: "Storage", expected_answer: "Object storage manages data as objects with metadata, while block storage breaks data into blocks and stores them as separate pieces." },
    { question: "What is 'VPC' (Virtual Private Cloud)?", difficulty: "medium", topic: "Networking", expected_answer: "A private, isolated section of a public cloud where you can launch resources in a virtual network that you define." },
    { question: "What is 'Edge Computing'?", difficulty: "hard", topic: "Cloud Architecture", expected_answer: "A distributed computing paradigm that brings computation and data storage closer to the sources of data." },
    { question: "What is 'Cloud Governance'?", difficulty: "medium", topic: "Management", expected_answer: "A set of rules and policies applied by companies that use cloud services to ensure data security and manage costs." },
    { question: "Explain 'Elasticity' in cloud computing.", difficulty: "medium", topic: "Cloud Concepts", expected_answer: "The ability of a system to grow or shrink its resource allocation dynamically in response to workload changes." },
    { question: "What is 'Hybrid Cloud'?", difficulty: "medium", topic: "Cloud Models", expected_answer: "A computing environment that combines a public cloud and a private cloud by allowing data and applications to be shared between them." },
    { question: "What is 'Cold Storage' in the cloud?", difficulty: "easy", topic: "Storage", expected_answer: "A storage class designed for data that is rarely accessed, offering lower costs but higher retrieval times." },
    { question: "Explain 'Infrastructure as Code' (IaC) tools like CloudFormation.", difficulty: "medium", topic: "Automation", expected_answer: "Tools that allow you to model and set up your cloud resources using a template file." },
    { question: "What is 'Cloud Bursting'?", difficulty: "hard", topic: "Cloud Strategy", expected_answer: "A configuration that allows a private cloud to access public cloud resources when its own capacity is reached." },
    { question: "Explain 'Shared Responsibility Model'.", difficulty: "medium", topic: "Security", expected_answer: "A cloud security framework that dictates which security tasks are handled by the cloud provider and which are handled by the customer." },
    { question: "What is 'Cloud Agnostic' vs 'Cloud Native'?", difficulty: "medium", topic: "Cloud Strategy", expected_answer: "Cloud agnostic means designed to run on any cloud provider, while cloud native means designed specifically to exploit cloud features." },
    { question: "What is 'Serverless Database'?", difficulty: "medium", topic: "Storage", expected_answer: "A database that automatically scales its capacity based on demand, with users paying only for what they use." },
    { question: "Explain 'Cold Start' in serverless.", difficulty: "hard", topic: "Cloud Architecture", expected_answer: "The latency experienced when a serverless function is triggered for the first time after being idle, as the provider must initialize the environment." },
    { question: "What is 'Micro-segmentation' in cloud networking?", difficulty: "hard", topic: "Networking", expected_answer: "A security technique that enables fine-grained security policies to be assigned to individual workloads." },
    { question: "What is 'Cloud Orchestration'?", difficulty: "medium", topic: "Automation", expected_answer: "The end-to-end automation of the deployment and management of cloud resources." },
    { question: "Explain 'Reserved Instances' vs 'Spot Instances'.", difficulty: "medium", topic: "Cost Management", expected_answer: "Reserved instances are pre-paid for a term for a discount, while spot instances are unused capacity available at a steep discount but can be reclaimed by the provider." },
    { question: "What is 'Multi-tenancy'?", difficulty: "easy", topic: "Cloud Concepts", expected_answer: "An architecture where a single instance of software serves multiple customers (tenants)." },
    { question: "Explain 'Cloud Migration' strategies (6 R's).", difficulty: "hard", topic: "Cloud Strategy", expected_answer: "Rehost, Replatform, Refactor, Repurchase, Retire, and Retain." },
    { question: "What is 'Data Sovereignty'?", difficulty: "medium", topic: "Compliance", expected_answer: "The concept that digital data is subject to the laws of the country in which it is located." },
    { question: "What is 'Cloud Compliance' (e.g., HIPAA, GDPR)?", difficulty: "medium", topic: "Compliance", expected_answer: "Ensuring that cloud services meet specific regulatory and industry standards for data protection." },
    { question: "Explain 'Direct Connect' or 'ExpressRoute'.", difficulty: "medium", topic: "Networking", expected_answer: "Dedicated network connections from on-premises data centers to a cloud provider, bypassing the public internet." },
    { question: "What is 'Cloud Service Brokerage'?", difficulty: "hard", topic: "Management", expected_answer: "An IT role and business model in which a company or other entity adds value to one or more cloud services on behalf of one or more consumers." },
    { question: "What is 'Fog Computing'?", difficulty: "hard", topic: "Cloud Architecture", expected_answer: "A decentralized computing infrastructure in which data, compute, storage and applications are located somewhere between the data source and the cloud." },
    { question: "Explain 'Cloud Cost Optimization' techniques.", difficulty: "medium", topic: "Cost Management", expected_answer: "Right-sizing instances, using reserved/spot instances, and deleting unused resources." },
    { question: "What is 'Function as a Service' (FaaS)?", difficulty: "medium", topic: "Cloud Models", expected_answer: "A category of cloud computing services that provides a platform allowing customers to develop, run, and manage application functionalities without the complexity of building and maintaining the infrastructure." },
    { question: "Explain 'Cloud Security Posture Management' (CSPM).", difficulty: "hard", topic: "Security", expected_answer: "A set of security tools and practices that enable compliance and risk management in the cloud." },
    { question: "What is 'Shadow IT' in the cloud?", difficulty: "medium", topic: "Management", expected_answer: "The use of cloud services by employees without the explicit approval or knowledge of the IT department." },
    { question: "What is 'Cloud Portability'?", difficulty: "medium", topic: "Cloud Strategy", expected_answer: "The ability to move applications and data from one cloud provider to another with minimal effort." }
  ],
  "AI": [
    { question: "What is a neural network and how does it learn?", difficulty: "medium", topic: "Deep Learning", expected_answer: "A series of algorithms that mimic the human brain to recognize patterns. It learns by adjusting weights through backpropagation based on errors." },
    { question: "Explain the difference between Deep Learning and Machine Learning.", difficulty: "medium", topic: "AI Concepts", expected_answer: "Machine learning is a subset of AI that uses algorithms to parse data, while deep learning is a subset of ML that uses multi-layered neural networks." },
    { question: "What is Natural Language Processing (NLP)?", difficulty: "medium", topic: "AI Applications", expected_answer: "A field of AI that focuses on the interaction between computers and human language, including speech recognition and text analysis." },
    { question: "What are some ethical considerations in AI development?", difficulty: "medium", topic: "AI Ethics", expected_answer: "Bias in training data, transparency, privacy, and the impact on employment." },
    { question: "Explain the concept of reinforcement learning.", difficulty: "medium", topic: "Learning Paradigms", expected_answer: "A type of machine learning where an agent learns to make decisions by performing actions and receiving rewards or penalties." },
    { question: "What is 'Generative AI'?", difficulty: "medium", topic: "AI Trends", expected_answer: "A type of AI system capable of generating text, images, or other media in response to prompts." },
    { question: "Explain the concept of 'Transformers' in NLP.", difficulty: "hard", topic: "Deep Learning", expected_answer: "A deep learning model architecture that uses self-attention mechanisms, widely used in modern NLP models like GPT." },
    { question: "What is 'Computer Vision'?", difficulty: "medium", topic: "AI Applications", expected_answer: "A field of AI that enables computers and systems to derive meaningful information from digital images, videos and other visual inputs." },
    { question: "What is 'Turing Test'?", difficulty: "easy", topic: "AI History", expected_answer: "A test of a machine's ability to exhibit intelligent behavior equivalent to, or indistinguishable from, that of a human." },
    { question: "Explain 'Overfitting' in the context of AI models.", difficulty: "medium", topic: "Model Training", expected_answer: "When a model learns the training data too well, including its noise, leading to poor performance on new, unseen data." },
    { question: "What is 'Transfer Learning'?", difficulty: "medium", topic: "Deep Learning", expected_answer: "A machine learning method where a model developed for a task is reused as the starting point for a model on a second task." },
    { question: "Explain 'Explainable AI' (XAI).", difficulty: "hard", topic: "AI Ethics", expected_answer: "A set of processes and methods that allows human users to comprehend and trust the results and output created by machine learning algorithms." },
    { question: "What is 'Feature Extraction'?", difficulty: "medium", topic: "Data Preprocessing", expected_answer: "The process of transforming raw data into a set of features that can be used by a machine learning algorithm." },
    { question: "What is 'Supervised Learning'?", difficulty: "easy", topic: "Learning Paradigms", expected_answer: "A type of machine learning where the model is trained on a labeled dataset." },
    { question: "What is 'Unsupervised Learning'?", difficulty: "easy", topic: "Learning Paradigms", expected_answer: "A type of machine learning where the model is trained on an unlabeled dataset." },
    { question: "What is 'Reinforcement Learning from Human Feedback' (RLHF)?", difficulty: "hard", topic: "Deep Learning", expected_answer: "A technique that uses human feedback to optimize a language model's performance and alignment." },
    { question: "Explain 'Fine-tuning' vs 'Prompt Engineering'.", difficulty: "medium", topic: "Model Training", expected_answer: "Fine-tuning involves retraining a model on a specific dataset, while prompt engineering involves crafting inputs to get better outputs from a pre-trained model." },
    { question: "What is 'Retrieval-Augmented Generation' (RAG)?", difficulty: "hard", topic: "AI Architecture", expected_answer: "A framework for retrieving facts from an external knowledge base to ground large language models on the most accurate, up-to-date information." },
    { question: "What is 'Vector Database'?", difficulty: "medium", topic: "Data Storage", expected_answer: "A type of database that stores data as high-dimensional vectors, which are mathematical representations of features or attributes." },
    { question: "Explain 'Attention Mechanism'.", difficulty: "hard", topic: "Deep Learning", expected_answer: "A technique that allows a model to focus on specific parts of the input sequence when producing an output." },
    { question: "What is 'Large Language Model' (LLM)?", difficulty: "easy", topic: "AI Concepts", expected_answer: "A type of AI model trained on vast amounts of text data to understand and generate human-like language." },
    { question: "What is 'Hallucination' in AI?", difficulty: "medium", topic: "AI Concepts", expected_answer: "When an AI model generates information that is factually incorrect or nonsensical but presented as true." },
    { question: "Explain 'Few-shot' vs 'Zero-shot' learning.", difficulty: "medium", topic: "Learning Paradigms", expected_answer: "Zero-shot means the model performs a task without any examples, while few-shot means it's given a small number of examples." },
    { question: "What is 'Latent Space'?", difficulty: "hard", topic: "Deep Learning", expected_answer: "A compressed representation of data where similar items are mapped closer together." },
    { question: "What is 'Diffusion Model'?", difficulty: "hard", topic: "Generative AI", expected_answer: "A class of generative models that learn to generate data by reversing a gradual noise process." },
    { question: "Explain 'Autoencoder'.", difficulty: "hard", topic: "Deep Learning", expected_answer: "A type of neural network used to learn efficient codings of input data, typically for dimensionality reduction or feature learning." },
    { question: "What is 'AI Alignment'?", difficulty: "medium", topic: "AI Ethics", expected_answer: "The research area focused on ensuring that AI systems' goals and behaviors are aligned with human values and intentions." },
    { question: "Explain 'Bias' in AI models.", difficulty: "medium", topic: "AI Ethics", expected_answer: "Prejudices or errors in AI systems that result from biased training data or algorithmic design." },
    { question: "What is 'Synthetic Data'?", difficulty: "medium", topic: "Data Science", expected_answer: "Information that is artificially manufactured rather than generated by real-world events." },
    { question: "What is 'Edge AI'?", difficulty: "medium", topic: "AI Architecture", expected_answer: "The deployment of AI algorithms directly on local devices rather than in a centralized cloud." },
    { question: "Explain 'Model Quantization'.", difficulty: "hard", topic: "AI Architecture", expected_answer: "A technique to reduce the size of AI models and improve inference speed by using lower-precision numerical representations." },
    { question: "What is 'Inference' vs 'Training'?", difficulty: "easy", topic: "AI Concepts", expected_answer: "Training is the process of teaching a model, while inference is the process of using the trained model to make predictions." },
    { question: "What is 'Hyperparameter Tuning'?", difficulty: "medium", topic: "Model Training", expected_answer: "The process of finding the optimal settings for a machine learning algorithm that are not learned from the data." },
    { question: "Explain 'Neural Architecture Search' (NAS).", difficulty: "hard", topic: "Deep Learning", expected_answer: "A technique for automating the design of artificial neural networks." },
    { question: "What is 'Stochastic Gradient Descent' (SGD)?", difficulty: "medium", topic: "Deep Learning", expected_answer: "An iterative method for optimizing an objective function with suitable smoothness properties." }
  ],
  "UI/UX Design": [
    { question: "What is the difference between UI and UX design?", difficulty: "medium", topic: "Design Basics", expected_answer: "UI focuses on the visual elements (buttons, icons), while UX focuses on the overall experience and how the user interacts with the product." },
    { question: "Explain the importance of user research in the design process.", difficulty: "medium", topic: "Design Process", expected_answer: "It helps designers understand user needs, behaviors, and pain points, leading to more effective and user-centered designs." },
    { question: "What are the key principles of responsive design?", difficulty: "medium", topic: "Web Design", expected_answer: "Fluid grids, flexible images, and media queries to ensure a site looks good on all devices." },
    { question: "How do you ensure accessibility in your designs?", difficulty: "medium", topic: "Accessibility", expected_answer: "By using high contrast colors, clear typography, and ensuring the interface is navigable via keyboard and screen readers." },
    { question: "What is a design system and why is it useful?", difficulty: "medium", topic: "Design Systems", expected_answer: "A collection of reusable components and standards that ensure consistency and speed up the design and development process." },
    { question: "What is 'Information Architecture'?", difficulty: "medium", topic: "Design Strategy", expected_answer: "The structural design of shared information environments; the art and science of organizing and labeling websites and intranets to support usability and findability." },
    { question: "Explain the concept of 'Wireframing'.", difficulty: "easy", topic: "Design Process", expected_answer: "A low-fidelity way to present a product's layout and structure without visual design elements." },
    { question: "What is 'Prototyping'?", difficulty: "medium", topic: "Design Process", expected_answer: "The process of creating an experimental version of a product to test concepts and gather feedback." },
    { question: "Explain 'Visual Hierarchy'.", difficulty: "medium", topic: "Visual Design", expected_answer: "The arrangement or presentation of elements in a way that implies importance." },
    { question: "What is 'User Journey Mapping'?", difficulty: "medium", topic: "UX Research", expected_answer: "A visual representation of the process a person goes through in order to accomplish a goal." },
    { question: "What is 'Usability Testing'?", difficulty: "medium", topic: "UX Research", expected_answer: "A technique used in user-centered interaction design to evaluate a product by testing it on users." },
    { question: "Explain 'Color Theory' in design.", difficulty: "medium", topic: "Visual Design", expected_answer: "The collection of rules and guidelines regarding the use of color in art and design." },
    { question: "What is 'Typography'?", difficulty: "easy", topic: "Visual Design", expected_answer: "The art and technique of arranging type to make written language legible, readable and appealing when displayed." },
    { question: "What is 'Grid System' in design?", difficulty: "medium", topic: "Visual Design", expected_answer: "A structure made up of a series of intersecting lines used to structure content." },
    { question: "Explain 'Affordance' in UX.", difficulty: "hard", topic: "UX Principles", expected_answer: "A property or feature of an object which presents a prompt on what can be done with this object." },
    { question: "What is 'Gestalt Principles'?", difficulty: "medium", topic: "Visual Design", expected_answer: "Principles that describe how humans naturally perceive objects as organized patterns and objects." },
    { question: "Explain 'Fitts's Law'.", difficulty: "hard", topic: "UX Principles", expected_answer: "A predictive model of human movement primarily used in human-computer interaction and ergonomics." },
    { question: "What is 'Hick's Law'?", difficulty: "medium", topic: "UX Principles", expected_answer: "A principle that states the time it takes to make a decision increases with the number and complexity of choices." },
    { question: "What is 'Mental Model' in UX?", difficulty: "medium", topic: "UX Research", expected_answer: "What a user believes to be true about a system, which affects how they interact with it." },
    { question: "Explain 'User Persona'.", difficulty: "easy", topic: "UX Research", expected_answer: "A fictional character created to represent a user type that might use a site, brand, or product in a similar way." },
    { question: "What is 'Empathy Map'?", difficulty: "medium", topic: "UX Research", expected_answer: "A collaborative tool teams can use to gain a deeper insight into their customers." },
    { question: "What is 'Card Sorting'?", difficulty: "medium", topic: "UX Research", expected_answer: "A method used to help design or evaluate the information architecture of a site." },
    { question: "Explain 'Design Thinking' process.", difficulty: "medium", topic: "Design Process", expected_answer: "An iterative process in which we seek to understand the user, challenge assumptions, and redefine problems." },
    { question: "What is 'Double Diamond' model?", difficulty: "hard", topic: "Design Process", expected_answer: "A design process model that includes four stages: Discover, Define, Develop, and Deliver." },
    { question: "Explain 'Micro-interactions'.", difficulty: "medium", topic: "Visual Design", expected_answer: "Small, functional animations that support the user by giving visual feedback and displaying status." },
    { question: "What is 'Skeleton Screen'?", difficulty: "medium", topic: "Visual Design", expected_answer: "A low-fidelity UI that is shown while content is loading to improve perceived performance." },
    { question: "What is 'Empty State' design?", difficulty: "medium", topic: "Visual Design", expected_answer: "The screen that users see when there is no data to display, used to provide guidance or encouragement." },
    { question: "Explain 'Dark Patterns'.", difficulty: "hard", topic: "UX Ethics", expected_answer: "User interfaces that have been carefully crafted to trick users into doing things they didn't intend to do." },
    { question: "What is 'Atomic Design' methodology?", difficulty: "hard", topic: "Design Systems", expected_answer: "A methodology for creating design systems composed of five distinct levels: atoms, molecules, organisms, templates, and pages." },
    { question: "What is 'Design Debt'?", difficulty: "medium", topic: "Design Process", expected_answer: "The accumulation of design inconsistencies and shortcuts that make it harder to maintain and evolve a product." },
    { question: "Explain 'Accessibility' (a11y) standards (WCAG).", difficulty: "medium", topic: "Accessibility", expected_answer: "Web Content Accessibility Guidelines that ensure web content is accessible to people with disabilities." },
    { question: "What is 'Contrast Ratio'?", difficulty: "easy", topic: "Visual Design", expected_answer: "The difference in luminance or color that makes an object distinguishable from its background." },
    { question: "What is 'Golden Ratio' in design?", difficulty: "medium", topic: "Visual Design", expected_answer: "A mathematical ratio commonly found in nature that can be used to create pleasing, organic-looking compositions." },
    { question: "Explain 'Whitespace' importance.", difficulty: "easy", topic: "Visual Design", expected_answer: "The area between design elements, used to improve readability, focus, and overall aesthetics." },
    { question: "What is 'Mood Board'?", difficulty: "easy", topic: "Design Process", expected_answer: "A type of visual presentation or 'collage' consisting of images, text, and samples of objects in a composition." }
  ]
};

const RESUME_MOCK_QUESTIONS: InterviewQuestion[] = [
  { question: "Can you walk me through the most challenging project listed on your resume?", difficulty: "medium", topic: "Experience", expected_answer: "Detailed explanation of a project, the challenges faced, and how they were overcome." },
  { question: "How have you applied the primary technical skills mentioned in your resume in a real-world scenario?", difficulty: "medium", topic: "Technical Skills", expected_answer: "Specific examples of using their tech stack to solve problems or build features." },
  { question: "I see you've worked with various technologies. Which one are you most proficient in and why?", difficulty: "easy", topic: "Proficiency", expected_answer: "Identification of a key skill and justification based on experience." },
  { question: "Describe a situation where you had to learn a new technology quickly to meet a project deadline.", difficulty: "medium", topic: "Adaptability", expected_answer: "Example of fast learning and successful implementation under pressure." },
  { question: "Based on your experience, how do you approach debugging complex issues in a production environment?", difficulty: "hard", topic: "Problem Solving", expected_answer: "Systematic approach to troubleshooting, including logs, reproduction, and testing." }
];

export const Interview = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ 
    confidence: 0, 
    pauses: 0, 
    fumbling: 0, 
    isUserDetected: false,
    focus: 0,
    eyeContact: 0
  });
  const [aggregateMetrics, setAggregateMetrics] = useState<{
    confidence: number[];
    pauses: number;
    fumbling: number[];
    focus: number[];
    eyeContact: number[];
  }>({ confidence: [], pauses: 0, fumbling: [], focus: [], eyeContact: [] });
  const [domain, setDomain] = useState("Web Development");
  const [difficulty, setDifficulty] = useState("medium");
  const [score, setScore] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [resumeText, setResumeText] = useState("");
  const [report, setReport] = useState<InterviewReport | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const initVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0 && !selectedVoiceRef.current) {
        const femaleVoice = voices.find(v => 
          (v.name.toLowerCase().includes('female') || 
           v.name.toLowerCase().includes('samantha') || 
           v.name.toLowerCase().includes('victoria') ||
           v.name.toLowerCase().includes('google uk english female')) &&
          v.lang.includes('en')
        ) || voices.find(v => v.lang.includes('en')) || voices[0];
        
        selectedVoiceRef.current = femaleVoice;
      }
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      initVoice();
      window.speechSynthesis.onvoiceschanged = initVoice;
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const cleanText = text.replace(/[^\x20-\x7E\n]/g, '').slice(0, 5000);
        setResumeText(cleanText);
      };
      reader.readAsText(file);
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      if (final) {
        setUserAnswer(prev => prev + (prev ? ' ' : '') + final);
        setInterimTranscript("");
      } else {
        setInterimTranscript(interim);
      }
    };
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        // Silently handle no-speech to avoid confusing error logs
        // The onend handler will take care of resetting isListening
        return;
      }
      console.error("Speech recognition error:", event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  const handleSpeak = async (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (!selectedVoiceRef.current) {
        const voices = window.speechSynthesis.getVoices();
        selectedVoiceRef.current = voices.find(v => 
          (v.name.toLowerCase().includes('female') || 
           v.name.toLowerCase().includes('samantha') || 
           v.name.toLowerCase().includes('victoria') ||
           v.name.toLowerCase().includes('google uk english female')) &&
          v.lang.includes('en')
        ) || voices.find(v => v.lang.includes('en')) || voices[0];
      }

      if (selectedVoiceRef.current) utterance.voice = selectedVoiceRef.current;
      utterance.rate = 1.0;
      utterance.pitch = 1.1; // Slightly higher pitch for a more natural female tone if needed
      window.speechSynthesis.speak(utterance);
    }
  };

  const startInterview = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      let question: InterviewQuestion;
      if (type === 'resume') {
        if (!resumeText) throw new Error("Please upload your resume first.");
        question = await generateQuestion({ difficulty, resume: resumeText, history: [] });
      } else {
        const questions = DOMAIN_QUESTIONS[domain] || DOMAIN_QUESTIONS["Web Development"];
        question = questions[0];
      }
      setCurrentQuestion(question);
      setIsStarted(true);
      handleSpeak(question.question);
    } catch (err: any) {
      setError(err.message || "Failed to start interview.");
    } finally {
      setIsGenerating(false);
    }
  };

  const endSession = () => setShowEndConfirmation(true);

  const handleMetricsUpdate = (newMetrics: { 
    confidence: number; 
    pauses: number; 
    fumbling: number; 
    isUserDetected: boolean;
    focus: number;
    eyeContact: number;
  }) => {
    if (!isStarted || isEvaluating || isFinished || isGenerating) return;
    setMetrics(newMetrics);
    setAggregateMetrics(prev => ({
      confidence: [...prev.confidence, newMetrics.confidence],
      pauses: 0, // Pause detection removed
      fumbling: [...prev.fumbling, newMetrics.fumbling],
      focus: [...prev.focus, newMetrics.focus],
      eyeContact: [...prev.eyeContact, newMetrics.eyeContact]
    }));
  };

  // Sync ref with state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isFinished && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [isFinished]);

  const downloadPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("Interview Performance Report", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Domain: ${domain}`, 20, 30);
    doc.text(`Overall Score: ${report.overall_score}%`, 20, 35);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 40);
    
    doc.setFontSize(16);
    doc.text("Summary", 20, 55);
    doc.setFontSize(10);
    const splitSummary = doc.splitTextToSize(report.summary, 170);
    doc.text(splitSummary, 20, 65);
    
    doc.setFontSize(16);
    doc.text("Strengths", 20, 90);
    doc.setFontSize(10);
    report.strengths.forEach((s, i) => {
      doc.text(`• ${s}`, 25, 100 + (i * 7));
    });
    
    doc.setFontSize(16);
    doc.text("Areas for Improvement", 20, 130);
    doc.setFontSize(10);
    report.improvements.forEach((im, i) => {
      doc.text(`• ${im}`, 25, 140 + (i * 7));
    });

    const tableData = history.map((item, idx) => [
      `Q${idx + 1}`,
      item.question.question,
      `${item.evaluation.score}/10`
    ]);

    autoTable(doc, {
      startY: 170,
      head: [['#', 'Question', 'Score']],
      body: tableData,
    });
    
    doc.save(`Interview_Report_${domain.replace(/\s+/g, '_')}.pdf`);
  };

  const saveSession = async (reportData: InterviewReport) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'interview_sessions'), {
        userId: user.uid,
        domain,
        type,
        score: reportData.overall_score,
        report: reportData,
        history: history.map(h => ({
          question: h.question.question,
          answer: h.answer,
          score: h.evaluation.score,
          feedback: h.evaluation.feedback
        })),
        metrics,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error saving session:", err);
    }
  };

  const stopInterviewer = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const confirmEndSession = async () => {
    stopInterviewer();
    setShowEndConfirmation(false);
    
    if (history.length === 0) {
      setIsFinished(true);
      return;
    }
    
    setIsGenerating(true);
    try {
      // Simulate Local ML Report Generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const avgScore = history.reduce((acc, curr) => acc + curr.evaluation.score, 0) / history.length;
      
      const strengths = [];
      if (avgScore > 7) strengths.push("Strong technical foundation in core concepts");
      if (metrics.confidence > 0.7) strengths.push("Confident and clear communication style");
      if (metrics.fumbling < 0.1) strengths.push("High verbal fluency with minimal filler words");
      if (strengths.length < 3) strengths.push("Demonstrated ability to handle technical pressure");
      
      const improvements = [];
      if (avgScore < 8) improvements.push("Deepen understanding of advanced implementation details");
      if (metrics.pauses > 2) improvements.push("Work on reducing long pauses during technical explanations");
      if (metrics.fumbling > 0.15) improvements.push("Minimize use of filler words like 'um' and 'like'");
      if (improvements.length < 3) improvements.push("Practice more real-world scenario based questions");

      const reportData: InterviewReport = {
        summary: `The candidate demonstrated a ${avgScore > 7.5 ? 'high' : avgScore > 5 ? 'moderate' : 'basic'} level of proficiency in ${domain}. Their technical responses showed ${avgScore > 7 ? 'depth' : 'some gaps'} in understanding. Communication was ${metrics.confidence > 0.7 ? 'steady' : 'hesitant'} with ${metrics.pauses} pauses noted.`,
        strengths: strengths.slice(0, 3),
        improvements: improvements.slice(0, 3),
        overall_score: Math.round(avgScore * 10),
        domain_mastery: [
          { topic: domain, score: Math.round(avgScore * 10) },
          { topic: "Communication", score: Math.round(metrics.confidence * 100) },
          { topic: "Fluency", score: Math.round((1 - metrics.fumbling) * 100) }
        ]
      };
      
      setReport(reportData);
      await saveSession(reportData);
      setIsFinished(true);
    } catch (err: any) {
      console.error("Failed to generate report:", err);
      setError("Failed to generate comprehensive report. Showing basic results instead.");
      setIsFinished(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!userAnswer.trim() || !currentQuestion) return;
    
    // Stop listening if active
    if (isListeningRef.current && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setIsEvaluating(true);
    setError(null);
    
    try {
      let evaluation: EvaluationResult;

      if (type === 'resume') {
        evaluation = await evaluateAnswer({
          question: currentQuestion.question,
          expected_answer: currentQuestion.expected_answer || "",
          user_answer: userAnswer,
          resume: resumeText
        });
      } else {
        // LOCAL ML-SIMULATED EVALUATION ALGORITHM (No AI/LLM)
        await new Promise(resolve => setTimeout(resolve, 1500));

        const userLower = userAnswer.toLowerCase();
        const expectedLower = (currentQuestion.expected_answer || "").toLowerCase();

        // 1. Advanced String Matching (Token Overlap + Similarity)
        const userWords = userLower.split(/\W+/).filter(w => w.length > 0);
        const expectedWords = expectedLower.split(/\W+/).filter(w => w.length > 0);
        const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'to', 'of', 'in', 'for', 'with', 'it', 'that', 'by', 'this', 'that', 'those', 'these', 'i', 'you', 'we', 'they']);
        
        const technicalKeywords = expectedWords.filter(w => w.length > 3 && !stopWords.has(w));
        let matchedCount = 0;
        const matchedKeywords: string[] = [];

        technicalKeywords.forEach(kw => {
          if (userWords.includes(kw)) {
            matchedCount++;
            matchedKeywords.push(kw);
          } else {
            // Check synonyms
            const synonyms = SYNONYMS[kw] || [];
            if (synonyms.some(s => userWords.includes(s))) {
              matchedCount += 0.8;
              matchedKeywords.push(kw);
            }
          }
        });
        
        const keywordRatio = technicalKeywords.length > 0 ? matchedCount / technicalKeywords.length : 1;
        const similarity = stringSimilarity.compareTwoStrings(userLower, expectedLower);
        
        // Match Percentage (ML Algorithm)
        const matchPercentage = (keywordRatio * 0.7 + similarity * 0.3) * 100;
        
        // 2. Confidence & Fluency Analysis
        const foundFillers = userWords.filter(w => FILLER_WORDS.includes(w));
        const fillerPenalty = Math.min(2, foundFillers.length * 0.4);

        // 3. Camera Metrics Analysis (Focus & Eye Contact)
        const avgFocus = aggregateMetrics.focus.length > 0 
          ? aggregateMetrics.focus.reduce((a, b) => a + b, 0) / aggregateMetrics.focus.length 
          : metrics.focus;
        const avgEyeContact = aggregateMetrics.eyeContact.length > 0
          ? aggregateMetrics.eyeContact.reduce((a, b) => a + b, 0) / aggregateMetrics.eyeContact.length
          : metrics.eyeContact;
        
        // 4. Scoring Logic based on Match Percentage
        let finalScore = 0;
        if (matchPercentage >= 80) {
          // 80% match -> Score 8 to 10
          finalScore = 8 + Math.round((matchPercentage - 80) / 10);
        } else if (matchPercentage >= 50) {
          // 50-80% match -> Score 5 to 7
          finalScore = 5 + Math.round((matchPercentage - 50) / 10);
        } else if (matchPercentage > 0) {
          // 1-50% match -> Score 2 to 5
          finalScore = 2 + Math.round((matchPercentage / 50) * 3);
        } else {
          // 0% match -> Score 0
          finalScore = 0;
        }

        // Adjust for communication/engagement (max +/- 1)
        const performanceBonus = (avgFocus > 0.8 && avgEyeContact > 0.7 && fillerPenalty < 0.5) ? 1 : 0;
        const performancePenalty = (avgFocus < 0.4 || fillerPenalty > 1.5) ? 1 : 0;
        
        finalScore = Math.min(10, Math.max(0, finalScore + performanceBonus - performancePenalty));

        // Randomized Feedback based on score (No AI)
        let feedbackLevel: 'high' | 'medium' | 'low' | 'none';
        if (finalScore >= 8) feedbackLevel = 'high';
        else if (finalScore >= 5) feedbackLevel = 'medium';
        else if (finalScore > 0) feedbackLevel = 'low';
        else feedbackLevel = 'none';

        const templates = FEEDBACK_TEMPLATES[feedbackLevel];
        const randomFeedback = templates[Math.floor(Math.random() * templates.length)];

        evaluation = {
          score: finalScore,
          feedback: randomFeedback + (finalScore < 7 && finalScore > 0 ? ` Focus on: ${technicalKeywords.filter(k => !matchedKeywords.includes(k)).slice(0, 2).join(', ')}.` : ""),
          next_difficulty: finalScore > 7 ? "hard" : "medium",
          missing_topics: finalScore < 7 ? technicalKeywords.filter(k => !matchedKeywords.includes(k)).slice(0, 3) : []
        };
      }

      // Calculate aggregate metrics for this answer
      const avgConfidence = aggregateMetrics.confidence.length > 0 
        ? aggregateMetrics.confidence.reduce((a, b) => a + b, 0) / aggregateMetrics.confidence.length 
        : metrics.confidence;
      
      const avgFumbling = aggregateMetrics.fumbling.length > 0
        ? aggregateMetrics.fumbling.reduce((a, b) => a + b, 0) / aggregateMetrics.fumbling.length
        : metrics.fumbling;

      const avgFocus = aggregateMetrics.focus.length > 0
        ? aggregateMetrics.focus.reduce((a, b) => a + b, 0) / aggregateMetrics.focus.length
        : metrics.focus;

      const avgEyeContact = aggregateMetrics.eyeContact.length > 0
        ? aggregateMetrics.eyeContact.reduce((a, b) => a + b, 0) / aggregateMetrics.eyeContact.length
        : metrics.eyeContact;

      const newEntry = {
        question: currentQuestion,
        answer: userAnswer,
        evaluation,
        metrics: { 
          confidence: avgConfidence,
          pauses: aggregateMetrics.pauses,
          fumbling: avgFumbling,
          focus: avgFocus,
          eyeContact: avgEyeContact
        }
      };

      // Reset aggregate metrics for next question
      setAggregateMetrics({ confidence: [], pauses: 0, fumbling: [], focus: [], eyeContact: [] });

      const updatedHistory = [...history, newEntry];
      setHistory(updatedHistory);
      setScore(prev => prev + evaluation.score);
      
      const maxQuestions = type === 'resume' ? 5 : (DOMAIN_QUESTIONS[domain]?.length || 5);

      if (updatedHistory.length >= maxQuestions) {
        setIsGenerating(true);
        // Simulate Report Generation Delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        const avgScore = updatedHistory.reduce((acc, curr) => acc + curr.evaluation.score, 0) / updatedHistory.length;
        
        let reportData: InterviewReport;
        
        if (type === 'resume') {
          reportData = await evaluateAnswer({ // Use evaluateAnswer for resume report generation if needed or simulate
            question: "Generate Report",
            expected_answer: "",
            user_answer: JSON.stringify(updatedHistory),
            resume: resumeText
          }) as any; // Mocking for now
        } else {
          // ADVANCED ML-SIMULATED REPORT GENERATION (Zero AI)
          const avgScore = updatedHistory.reduce((acc, curr) => acc + curr.evaluation.score, 0) / updatedHistory.length;
          
          // 1. Analyze Strengths based on metrics and scores
          const strengths = [];
          if (avgScore >= 8) strengths.push("Exceptional technical accuracy across all domain topics");
          else if (avgScore >= 6) strengths.push("Solid understanding of core technical principles");
          
          if (metrics.confidence > 0.75) strengths.push("Professional and confident delivery of technical answers");
          if (metrics.focus > 0.8) strengths.push("Maintained high levels of focus throughout the session");
          if (metrics.eyeContact > 0.7) strengths.push("Strong eye contact and engagement with the interviewer");
          if (metrics.fumbling < 0.08) strengths.push("Excellent verbal fluency with high precision in terminology");
          if (metrics.pauses <= 1) strengths.push("Natural and steady pace of communication");

          // 2. Analyze Improvements
          const improvements = [];
          if (avgScore < 8.5) improvements.push("Deepen knowledge in edge cases and advanced implementation patterns");
          if (metrics.confidence < 0.7) improvements.push("Practice speaking more clearly to project higher confidence");
          if (metrics.focus < 0.6) improvements.push("Try to stay more focused and minimize distractions during answers");
          if (metrics.eyeContact < 0.5) improvements.push("Improve eye contact to build better rapport during the interview");
          if (metrics.fumbling > 0.12) improvements.push("Reduce usage of filler words to sound more authoritative");
          if (metrics.pauses > 2) improvements.push("Minimize hesitation pauses during complex explanations");

          // 3. Generate Summary using ML-derived insights
          const performanceLevel = avgScore >= 8.5 ? "Expert" : avgScore >= 7 ? "Advanced" : avgScore >= 5 ? "Intermediate" : "Foundational";
          const communicationLevel = metrics.confidence > 0.75 ? "Excellent" : metrics.confidence > 0.5 ? "Good" : "Needs Work";
          
          const summary = `Candidate demonstrated ${performanceLevel} proficiency in ${domain}. Technical accuracy was ${avgScore >= 8 ? 'consistently high' : 'variable'}, with a final technical score of ${Math.round(avgScore * 10)}%. Communication skills were rated as ${communicationLevel}, characterized by ${metrics.pauses} significant pauses and a fluency rating of ${Math.round((1 - metrics.fumbling) * 100)}%. Focus and engagement metrics were ${metrics.focus > 0.7 ? 'strong' : 'developing'}. Overall, the candidate shows ${avgScore >= 7 ? 'strong' : 'developing'} potential for the role.`;

          reportData = {
            summary,
            strengths: strengths.slice(0, 3),
            improvements: improvements.slice(0, 3),
            overall_score: Math.round(avgScore * 10),
            domain_mastery: [
              { topic: domain, score: Math.round(avgScore * 10) },
              { topic: "Communication", score: Math.round(metrics.confidence * 100) },
              { topic: "Fluency", score: Math.round((1 - metrics.fumbling) * 100) },
              { topic: "Focus", score: Math.round(metrics.focus * 100) },
              { topic: "Eye Contact", score: Math.round(metrics.eyeContact * 100) }
            ]
          };
        }
        
        setReport(reportData);
        await saveSession(reportData);
        setIsFinished(true);
      } else {
        setIsGenerating(true);
        
        let nextQuestion: InterviewQuestion;

        if (type === 'resume') {
          nextQuestion = await generateQuestion({
            difficulty: evaluation.next_difficulty,
            resume: resumeText,
            history: updatedHistory
          });
          setQuestionIndex(updatedHistory.length);
        } else {
          const questions = DOMAIN_QUESTIONS[domain] || DOMAIN_QUESTIONS["Web Development"];
          const nextIdx = questionIndex + 1;
          setQuestionIndex(nextIdx);
          nextQuestion = questions[nextIdx];
        }

        setCurrentQuestion(nextQuestion);
        setUserAnswer("");
        handleSpeak(nextQuestion.question);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to evaluate answer. Please try again.");
    } finally {
      setIsEvaluating(false);
      setIsGenerating(false);
    }
  };

  if (isFinished) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <header className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-500/20">
            <CheckCircle2 className="text-emerald-500" size={40} />
          </div>
          <h1 className="text-4xl font-bold text-white">Interview Completed!</h1>
          <p className="text-slate-400 text-lg">Great job. Your personalized performance report is ready.</p>
        </header>

        {report && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-8 space-y-8 backdrop-blur-md"
          >
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-400" />
                ML Performance Summary
              </h3>
              <p className="text-slate-300 leading-relaxed italic">"{report.summary}"</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Key Strengths</h4>
                <ul className="space-y-3">
                  {report.strengths.map((s, i) => (
                    <li key={`strength-${i}`} className="flex items-start gap-3 text-slate-300 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-widest">Areas for Improvement</h4>
                <ul className="space-y-3">
                  {report.improvements.map((im, i) => (
                    <li key={`improvement-${i}`} className="flex items-start gap-3 text-slate-300 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      {im}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-800/50">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Domain Mastery Breakdown</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {report.domain_mastery.map((dm, i) => (
                  <div key={`mastery-${dm.topic}-${i}`} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-slate-500">{dm.topic}</span>
                      <span className="text-indigo-400">{dm.score}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${dm.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800/50 text-center space-y-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Overall Score</p>
            <p className="text-4xl font-bold text-white">{report ? report.overall_score : (score / history.length * 10).toFixed(0)}%</p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800/50 text-center space-y-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Confidence</p>
            <p className="text-4xl font-bold text-indigo-400">{(metrics.confidence * 100).toFixed(0)}%</p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800/50 text-center space-y-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Fluency</p>
            <p className="text-4xl font-bold text-emerald-400">{metrics.fumbling < 0.1 ? "High" : "Medium"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart2 size={20} className="text-indigo-400" />
            Detailed Question Review
          </h3>
          {history.map((item, idx) => (
            <div key={`history-item-${idx}`} className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Question {idx + 1}</p>
                  <p className="text-lg font-semibold text-white">{item.question.question}</p>
                </div>
                <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-sm font-bold ring-1 ring-indigo-500/20">
                  {item.evaluation.score}/10
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Feedback</p>
                <div className="text-slate-300 text-sm leading-relaxed">
                  <Markdown>{item.evaluation.feedback}</Markdown>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-4 pt-6">
          <button 
            onClick={downloadPDF}
            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all flex items-center gap-2"
          >
            <Download size={20} />
            Download PDF Report
          </button>
          <button 
            onClick={() => navigate('/progress')}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            View Full Analytics Dashboard
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {!isStarted ? (
        <div className="max-w-2xl mx-auto space-y-12 py-12">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-bold text-white">
                {type === 'resume' ? "Resume-Based Interview" : "Domain-Based Interview"}
              </h1>
            </div>
            <p className="text-slate-400 text-lg">
              {type === 'resume' 
                ? "Upload your resume to simulate a personalized technical screening based on your experience." 
                : "Select your specialization to begin your technical screening."}
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-8 space-y-8 backdrop-blur-md">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            {type === 'resume' ? (
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block">Upload Resume (PDF/DOCX)</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    onChange={handleResumeUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full border-2 border-dashed border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 group-hover:border-indigo-500/50 transition-all bg-slate-950/30">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center ring-1 ring-slate-800">
                      <Sparkles className="text-indigo-400" size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-white">{resumeText ? "Resume Uploaded" : "Drop your resume here"}</p>
                      <p className="text-xs text-slate-500 mt-1">{resumeText ? "Ready to analyze" : "or click to browse files"}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block">Select Domain</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.keys(DOMAIN_QUESTIONS).map(d => (
                    <button 
                      key={`domain-${d}`}
                      onClick={() => setDomain(d)}
                      className={cn(
                        "px-4 py-3 rounded-xl border text-sm font-semibold transition-all",
                        domain === d 
                          ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 ring-1 ring-indigo-500/20" 
                          : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={startInterview}
              disabled={isGenerating || (type === 'resume' && !resumeText)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 group"
            >
              {isGenerating ? "Preparing Interview..." : "Start Interview Session"}
              {!isGenerating && <Play size={20} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-8 min-h-[400px] flex flex-col backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                <motion.div 
                  className="h-full bg-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(history.length / 5) * 100}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Interviewer</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">Question {history.length + 1} of {type === 'resume' ? 5 : (DOMAIN_QUESTIONS[domain]?.length || 5)}</p>
                  </div>
                </div>
              </div>
              </div>

              <div className="flex-1 space-y-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion?.question}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="inline-flex px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-widest ring-1 ring-indigo-500/20">
                      {currentQuestion?.topic} • {currentQuestion?.difficulty}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                      {currentQuestion?.question}
                    </h2>
                    <button 
                      onClick={() => currentQuestion && handleSpeak(currentQuestion.question)}
                      className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors mt-2"
                    >
                      <Play size={12} fill="currentColor" />
                      Repeat Question
                    </button>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-10 space-y-4">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
                <div className="relative group">
                  <textarea 
                    value={userAnswer + (interimTranscript ? (userAnswer ? ' ' : '') + interimTranscript : '')}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        handleSubmit();
                      }
                    }}
                    placeholder="Type your answer here or use voice input..."
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-6 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all min-h-[150px] placeholder:text-slate-700"
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-3">
                    <button
                      onClick={toggleListening}
                      className={cn(
                        "p-3 rounded-xl transition-all flex items-center justify-center ring-1",
                        isListening 
                          ? "bg-red-500/10 border-red-500/50 text-red-400 ring-red-500/20 animate-pulse" 
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 ring-slate-800"
                      )}
                      title={isListening ? "Stop Listening" : "Start Voice Input"}
                    >
                      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest hidden sm:block">Press CMD + Enter to submit</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
              <button 
                onClick={() => {
                  stopInterviewer();
                  setIsStarted(false);
                  setHistory([]);
                  setScore(0);
                  setQuestionIndex(0);
                }}
                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ArrowLeft size={16} />
                Exit Session
              </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={isEvaluating || !userAnswer.trim()}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-3 group"
                  >
                    {isEvaluating ? "Evaluating..." : "Submit Answer"}
                    {!isEvaluating && <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-800/50">
                  <button 
                    onClick={endSession}
                    className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={14} />
                    End Session & Generate Report
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <CameraPreview isActive={isStarted && !isFinished} onMetricsUpdate={handleMetricsUpdate} />
            
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-6 space-y-6 backdrop-blur-md">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <BarChart2 size={16} className="text-indigo-400" />
                Live Signals
              </h3>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-slate-500">Confidence</span>
                    <span className="text-indigo-400">{(metrics.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${metrics.confidence * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-slate-500">Fluency</span>
                    <span className={cn(
                      "transition-colors",
                      metrics.fumbling < 0.1 ? "text-emerald-400" : 
                      metrics.fumbling < 0.3 ? "text-amber-400" : "text-rose-400"
                    )}>
                      {metrics.fumbling < 0.1 ? "High" : metrics.fumbling < 0.3 ? "Medium" : "Low / Silent"}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      className={cn(
                        "h-full transition-colors duration-500",
                        metrics.fumbling < 0.1 ? "bg-emerald-500" : 
                        metrics.fumbling < 0.3 ? "bg-amber-500" : "bg-rose-500"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, (1 - metrics.fumbling) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-slate-500">Focus</span>
                    <span className={cn(
                      "transition-colors",
                      metrics.focus > 0.7 ? "text-emerald-400" : 
                      metrics.focus > 0.4 ? "text-amber-400" : "text-rose-400"
                    )}>
                      {(metrics.focus * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      className={cn(
                        "h-full transition-colors duration-500",
                        metrics.focus > 0.7 ? "bg-emerald-500" : 
                        metrics.focus > 0.4 ? "bg-amber-500" : "bg-rose-500"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${metrics.focus * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-slate-500">Eye Contact</span>
                    <span className={cn(
                      "transition-colors",
                      metrics.eyeContact > 0.6 ? "text-emerald-400" : 
                      metrics.eyeContact > 0.3 ? "text-amber-400" : "text-rose-400"
                    )}>
                      {(metrics.eyeContact * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      className={cn(
                        "h-full transition-colors duration-500",
                        metrics.eyeContact > 0.6 ? "bg-emerald-500" : 
                        metrics.eyeContact > 0.3 ? "bg-amber-500" : "bg-rose-500"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${metrics.eyeContact * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center ring-1 transition-all",
                      metrics.isUserDetected ? "bg-emerald-500/10 ring-emerald-500/20" : "bg-red-500/10 ring-red-500/20"
                    )}>
                      <div className={cn("w-2 h-2 rounded-full", metrics.isUserDetected ? "bg-emerald-500" : "bg-red-500")} />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">User Presence</span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    metrics.isUserDetected ? "text-emerald-400" : "text-red-400"
                  )}>
                    {metrics.isUserDetected ? "Detected" : "Not Found"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center ring-1 ring-amber-500/20">
                      <AlertCircle className="text-amber-500" size={16} />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pauses Detected</span>
                  </div>
                  <span className="text-lg font-bold text-white">{metrics.pauses}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showEndConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-red-500/20">
                <AlertCircle className="text-red-500" size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white">End Interview Session?</h3>
                <p className="text-slate-400">
                  {history.length === 0 
                    ? "You haven't answered any questions yet. Are you sure you want to exit?" 
                    : "Are you sure you want to end the interview and generate your performance report?"}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setShowEndConfirmation(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmEndSession}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all"
                >
                  {history.length === 0 ? "Exit" : "End & Report"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
