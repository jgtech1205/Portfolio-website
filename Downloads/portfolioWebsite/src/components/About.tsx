import Image from "next/image";

export default function About() {
  return (
    <section id="about" className="py-20 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            About Me
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                I'm a passionate software engineer with a love for creating innovative 
                solutions that make a difference. With experience in full-stack development, 
                I enjoy working on projects that challenge me to learn and grow.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                When I'm not coding, you can find me exploring new technologies, 
                contributing to open-source projects, or working on personal projects 
                that solve real-world problems.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    Problem Solver
                  </span>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    Team Player
                  </span>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-lg">
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    Continuous Learner
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Experience
                </h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-600 pl-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Software Engineer
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Upwork Freelancer • 2024 - Present
                    </p>
                  </div>
                  <div className="border-l-4 border-gray-300 dark:border-gray-600 pl-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Junior Developer
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Wifi Sports Network • 2022 - 2024
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Education
                </h3>
                <div className="border-l-4 border-blue-600 pl-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Masters in Information Technology Management
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Western Governors University • 2018 - 2022
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Personal Photos Section */}
          <div className="mt-16">
            <h3 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-8">
              Beyond Code
            </h3>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="group relative">
                <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
                  <Image
                    src="/images/working.JPG"
                    alt="Working on projects"
                    width={600}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-center text-gray-600 dark:text-gray-400 mt-3">
                  In my element, crafting code
                </p>
              </div>
              <div className="group relative">
                <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
                  <Image
                    src="/images/family2.png"
                    alt="More family moments"
                    width={600}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-center text-gray-600 dark:text-gray-400 mt-3">
                  Quality time with family
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}