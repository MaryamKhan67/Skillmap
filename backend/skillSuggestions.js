import fetch from "node-fetch";

// Predefined skill graph (same as in constellation.html)
const predefinedSkillGraph = {
    // Frontend path
    "HTML": { next: ["CSS", "JavaScript"], category: "frontend" },
    "CSS": { next: ["JavaScript", "Sass", "Responsive Design"], category: "frontend" },
    "JavaScript": { next: ["React", "Vue", "Angular", "Node.js", "TypeScript"], category: "frontend" },
    "React": { next: ["Redux", "React Router", "Next.js"], category: "frontend" },
    "Vue": { next: ["Vuex", "Vue Router", "Nuxt.js"], category: "frontend" },
    "Angular": { next: ["RxJS", "NgRx"], category: "frontend" },
    "TypeScript": { next: [], category: "frontend" },
    
    // Backend path
    "Node.js": { next: ["Express.js", "NestJS", "Databases"], category: "backend" },
    "Express.js": { next: ["REST APIs", "Authentication", "WebSockets"], category: "backend" },
    "NestJS": { next: ["Microservices", "GraphQL"], category: "backend" },
    "Databases": { next: ["SQL", "MongoDB", "PostgreSQL"], category: "backend" },
    "SQL": { next: ["Database Design", "Query Optimization"], category: "backend" },
    "MongoDB": { next: ["Mongoose", "Aggregation Pipeline"], category: "backend" },
    "REST APIs": { next: ["API Design", "API Security"], category: "backend" },
    "GraphQL": { next: ["Apollo", "Relay"], category: "backend" },
    
    // DevOps path
    "Git": { next: ["CI/CD", "Docker"], category: "devops" },
    "Docker": { next: ["Kubernetes", "AWS", "Azure"], category: "devops" },
    "Kubernetes": { next: ["Helm", "Service Mesh"], category: "devops" },
    "CI/CD": { next: ["Jenkins", "GitHub Actions", "GitLab CI"], category: "devops" },
    
    // Design path
    "Figma": { next: ["UI Design", "Prototyping"], category: "design" },
    "Photoshop": { next: ["Photo Editing", "Graphic Design"], category: "design" },
    "Illustrator": { next: ["Vector Graphics", "Logo Design"], category: "design" },
    "UI Design": { next: ["UX Design", "Design Systems"], category: "design" },
    "UX Design": { next: ["User Research", "Usability Testing"], category: "design" },
    
    // Data Science path
    "Python": { next: ["Pandas", "NumPy", "Machine Learning"], category: "datascience" },
    "Pandas": { next: ["Data Analysis", "Data Visualization"], category: "datascience" },
    "NumPy": { next: ["Scientific Computing", "Linear Algebra"], category: "datascience" },
    "Machine Learning": { next: ["Deep Learning", "Scikit-learn", "TensorFlow"], category: "datascience" },
    "Deep Learning": { next: ["Neural Networks", "Computer Vision", "NLP"], category: "datascience" }
};

// Role definitions (same as in constellation.html)
const roleDefinitions = {
    "frontend": ["HTML", "CSS", "JavaScript", "React", "Responsive Design"],
    "backend": ["JavaScript", "Node.js", "Express.js", "Databases", "REST APIs"],
    "fullstack": ["HTML", "CSS", "JavaScript", "React", "Node.js", "Express.js", "Databases"],
    "ui-ux": ["Figma", "UI Design", "UX Design", "Prototyping"],
    "devops": ["Git", "Docker", "CI/CD", "Kubernetes"],
    "data-engineer": ["Python", "SQL", "Databases", "Data Processing"],
    "ml-engineer": ["Python", "Machine Learning", "Deep Learning", "TensorFlow"]
};

export async function getSkillSuggestions(skills, targetRole) {
  // If we have a target role, use our predefined graph to find the path
  if (targetRole && roleDefinitions[targetRole]) {
    return generatePathSuggestions(skills, targetRole);
  }
  
  // Fallback to the AI if no target role is specified
  const prompt = `
    User has skills: ${skills.join(", ")}.
    Suggest additional skills they should learn to advance their career.
    Return ONLY valid JSON in this format:
    {
      "suggestedSkills": [
        { "name": "React", "difficulty": "easy", "relatedTo": "JavaScript" },
        { "name": "Docker", "difficulty": "medium", "relatedTo": "Node.js" }
      ]
    }
  `;

  console.log("🟢 Sending prompt to Mistral via Ollama:", prompt);

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral",
        prompt: prompt,
        stream: false
      })
    });

    const result = await response.json();
    console.log("🔍 Raw response from Ollama:", result);

    let parsed;
    try {
      parsed = JSON.parse(result.response);
      
      // Normalize and clean AI output
      if (parsed.suggestedSkills && Array.isArray(parsed.suggestedSkills)) {
        parsed.suggestedSkills = parsed.suggestedSkills.map(skill => {
          return {
            name: skill.name || "Unknown",
            difficulty: skill.difficulty || skill.difficiency || "medium",
            relatedTo: skill.relatedTo || null
          };
        });
      } else {
        parsed = { suggestedSkills: [] };
      }
    } catch (err) {
      console.error("❌ Failed to parse AI JSON:", err);
      parsed = generatePathSuggestions(skills, "frontend"); // Fallback
    }

    return parsed;
  } catch (err) {
    console.error("❌ Ollama request failed:", err);
    return generatePathSuggestions(skills, "frontend"); // Fallback
  }
}

function generatePathSuggestions(knownSkills, targetRole) {
  // Find path from known skills to target role using our predefined graph
  const targetSkills = roleDefinitions[targetRole] || [];
  const suggestions = [];
  
  // For each target skill, find the shortest path from known skills
  for (const targetSkill of targetSkills) {
    // Skip if user already knows this skill
    if (knownSkills.includes(targetSkill)) continue;
    
    // Find the shortest path to this target skill
    const path = findShortestPathToSkill(knownSkills, targetSkill);
    
    if (path && path.length > 1) {
      // Add all skills in the path (except the known ones) as suggestions
      for (let i = 1; i < path.length; i++) {
        const skill = path[i];
        if (!knownSkills.includes(skill) && !suggestions.find(s => s.name === skill)) {
          suggestions.push({
            name: skill,
            difficulty: getDifficulty(skill),
            relatedTo: path[i-1] // The prerequisite skill
          });
        }
      }
    }
  }
  
  return { suggestedSkills: suggestions };
}

function findShortestPathToSkill(knownSkills, targetSkill) {
  // BFS to find shortest path from any known skill to target skill
  const queue = [];
  const visited = new Set();
  const paths = {};
  
  // Initialize with all known skills
  for (const skill of knownSkills) {
    queue.push(skill);
    visited.add(skill);
    paths[skill] = [skill];
  }
  
  while (queue.length > 0) {
    const currentSkill = queue.shift();
    
    // Found the target!
    if (currentSkill === targetSkill) {
      return paths[currentSkill];
    }
    
    // Get connected skills
    const connections = predefinedSkillGraph[currentSkill]?.next || [];
    for (const nextSkill of connections) {
      if (!visited.has(nextSkill)) {
        visited.add(nextSkill);
        paths[nextSkill] = [...paths[currentSkill], nextSkill];
        queue.push(nextSkill);
      }
    }
  }
  
  // No path found
  return null;
}

function getDifficulty(skillName) {
  // Simple difficulty estimation
  const beginnerSkills = ["HTML", "CSS", "Git", "Figma"];
  const advancedSkills = ["Kubernetes", "Microservices", "Deep Learning", "TensorFlow"];
  
  if (beginnerSkills.includes(skillName)) return "Beginner";
  if (advancedSkills.includes(skillName)) return "Advanced";
  return "Intermediate";
}

// Example usage if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  getSkillSuggestions(["HTML", "CSS"], "frontend")
    .then(console.log)
    .catch(console.error);
}