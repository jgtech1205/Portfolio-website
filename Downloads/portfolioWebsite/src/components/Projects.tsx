import Image from "next/image";

export default function Projects() {
  const projects = [
    {
      title: "Movie Studio",
      description: "A comprehensive movie streaming and discovery platform powered by TMDB API. Features include trending movies, top-rated films, upcoming releases, and detailed movie information with a modern, responsive design.",
      image: "/api/placeholder/600/400",
      technologies: ["React", "Next.js", "TMDB API", "Tailwind CSS", "Responsive Design"],
      liveUrl: "https://movie-studio-vosl.vercel.app/",
      githubUrl: "https://github.com/jgtech1205/Movie_Studio",
      featured: true,
    },
    {
      title: "Tulos E-commerce",
      description: "A full-stack fashion e-commerce platform featuring men's and women's clothing categories, shopping cart functionality, product filtering, and a sleek modern interface optimized for conversions.",
      image: "/api/placeholder/600/400",
      technologies: ["React", "E-commerce", "Shopping Cart", "Product Management", "Responsive Design"],
      liveUrl: "https://tulos-ecom-website.vercel.app/",
      githubUrl: "https://github.com/yourusername/tulos-ecommerce",
      featured: true,
    },
    {
      title: "AI Outliner",
      description: "An intelligent content structuring and organization tool powered by AI. Helps users create well-organized outlines and structure their content effectively with automated suggestions and optimization.",
      image: "/api/placeholder/600/400",
      technologies: ["AI Integration", "React", "Content Management", "Natural Language Processing"],
      liveUrl: "https://ai-outliner.vercel.app/",
      githubUrl: "https://github.com/jgtech1205/AIOutliner",
      featured: true,
    },
  ];

  return (
    <section id="projects" className="py-20 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Featured Projects
          </h2>
          
          {/* Featured Projects */}
          <div className="mb-16">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">
              Highlighted Work
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              {projects
                .filter((project) => project.featured)
                .map((project, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
                  >
                    <div className="h-64 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center">
                      <div className="text-gray-500 dark:text-gray-400 text-center">
                        <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4 4h16v2H4V4zm0 4h16v2H4V8zm0 4h16v2H4v-2zm0 4h16v2H4v-2z" />
                        </svg>
                        <p className="font-medium">{project.title}</p>
                      </div>
                    </div>
                    <div className="p-6">
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                        {project.title}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.technologies.map((tech) => (
                          <span
                            key={tech}
                            className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-sm font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-4">
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Live Demo
                        </a>
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          Code
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>


        </div>
      </div>
    </section>
  );
}