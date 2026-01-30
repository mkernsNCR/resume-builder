import type { ResumeContent } from "@shared/schema";

interface ClassicTemplateProps {
  content: ResumeContent;
}

export function ClassicTemplate({ content }: ClassicTemplateProps) {
  return (
    <div className="resume-preview bg-white p-8 w-[816px] h-[1056px] overflow-hidden font-serif" style={{ aspectRatio: '8.5 / 11' }}>
      {/* Header - Centered */}
      <header className="text-center mb-8 border-b-2 border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-gray-900 uppercase tracking-wide mb-2">
          {content.fullName || "Your Name"}
        </h1>
        {content.title && (
          <p className="text-lg text-gray-700 italic mb-3">{content.title}</p>
        )}
        
        {/* Contact Info */}
        {content.contact && (
          <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-600">
            {content.contact.email && <span>{content.contact.email}</span>}
            {content.contact.phone && (
              <>
                <span className="text-gray-400">|</span>
                <span>{content.contact.phone}</span>
              </>
            )}
            {content.contact.location && (
              <>
                <span className="text-gray-400">|</span>
                <span>{content.contact.location}</span>
              </>
            )}
            {content.contact.linkedin && (
              <>
                <span className="text-gray-400">|</span>
                <span>{content.contact.linkedin}</span>
              </>
            )}
          </div>
        )}
      </header>

      {/* Summary */}
      {content.summary && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-gray-300 pb-1 mb-3">
            Professional Summary
          </h2>
          <p className="text-gray-700 leading-relaxed text-justify">{content.summary}</p>
        </section>
      )}

      {/* Experience */}
      {content.experience && content.experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-gray-300 pb-1 mb-3">
            Professional Experience
          </h2>
          <div className="space-y-4">
            {content.experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-gray-900">{exp.position}</h3>
                  <span className="text-sm text-gray-600 italic">
                    {exp.startDate} - {exp.current ? "Present" : exp.endDate}
                  </span>
                </div>
                <p className="text-gray-700 italic mb-2">{exp.company}</p>
                {exp.description && (
                  <p className="text-gray-700">{exp.description}</p>
                )}
                {exp.highlights && exp.highlights.length > 0 && (
                  <ul className="list-disc ml-5 mt-2 text-gray-700 space-y-1">
                    {exp.highlights.map((highlight, idx) => (
                      <li key={idx}>{highlight}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {content.education && content.education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-gray-300 pb-1 mb-3">
            Education
          </h2>
          <div className="space-y-3">
            {content.education.map((edu) => (
              <div key={edu.id}>
                <div className="flex justify-between items-baseline">
                  <div>
                    <h3 className="font-bold text-gray-900">{edu.degree}</h3>
                    <p className="text-gray-700 italic">{edu.institution}</p>
                    {edu.field && <p className="text-gray-600 text-sm">{edu.field}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600 italic">
                      {edu.startDate} - {edu.endDate || "Present"}
                    </span>
                    {edu.gpa && <p className="text-sm text-gray-600">GPA: {edu.gpa}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {content.skills && content.skills.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-gray-300 pb-1 mb-3">
            Skills
          </h2>
          <p className="text-gray-700">
            {content.skills.map((skill) => skill.name).join(" • ")}
          </p>
        </section>
      )}

      {/* Projects */}
      {content.projects && content.projects.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-gray-300 pb-1 mb-3">
            Projects
          </h2>
          <div className="space-y-3">
            {content.projects.map((project) => (
              <div key={project.id}>
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold text-gray-900">{project.name}</h3>
                  {project.url && (
                    <span className="text-sm text-gray-600 italic">{project.url}</span>
                  )}
                </div>
                {project.description && (
                  <p className="text-gray-700 mt-1">{project.description}</p>
                )}
                {project.highlights && project.highlights.length > 0 && (
                  <ul className="list-disc ml-5 mt-2 text-gray-700 space-y-1">
                    {project.highlights.map((highlight, idx) => (
                      <li key={idx}>{highlight}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
