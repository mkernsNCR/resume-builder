import type { ResumeContent } from "@shared/schema";

interface MinimalTemplateProps {
  content: ResumeContent;
}

export function MinimalTemplate({ content }: MinimalTemplateProps) {
  return (
    <div className="resume-preview p-8 min-h-[1056px] w-full max-w-[816px] mx-auto">
      {/* Header - Clean and Simple */}
      <header className="mb-8">
        <h1 className="text-2xl font-light text-gray-900 tracking-wide">
          {content.fullName || "Your Name"}
        </h1>
        {content.title && (
          <p className="text-sm text-gray-500 mt-1 tracking-wide uppercase">
            {content.title}
          </p>
        )}
        
        {/* Contact Info */}
        {content.contact && (
          <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-3">
            {content.contact.email && <span>{content.contact.email}</span>}
            {content.contact.phone && <span>{content.contact.phone}</span>}
            {content.contact.location && <span>{content.contact.location}</span>}
            {content.contact.linkedin && <span>{content.contact.linkedin}</span>}
            {content.contact.website && <span>{content.contact.website}</span>}
          </div>
        )}
      </header>

      {/* Summary */}
      {content.summary && (
        <section className="mb-6">
          <p className="text-gray-600 leading-relaxed text-sm">{content.summary}</p>
        </section>
      )}

      {/* Experience */}
      {content.experience && content.experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
            Experience
          </h2>
          <div className="space-y-5">
            {content.experience.map((exp) => (
              <div key={exp.id} className="grid grid-cols-[140px_1fr] gap-4">
                <div className="text-xs text-gray-400">
                  <p>{exp.startDate}</p>
                  <p>{exp.current ? "Present" : exp.endDate}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">{exp.position}</h3>
                  <p className="text-gray-500 text-sm">{exp.company}</p>
                  {exp.description && (
                    <p className="text-gray-600 mt-2 text-xs leading-relaxed">
                      {exp.description}
                    </p>
                  )}
                  {exp.highlights && exp.highlights.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.highlights.map((highlight, idx) => (
                        <li key={idx} className="text-gray-600 text-xs">
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {content.education && content.education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
            Education
          </h2>
          <div className="space-y-4">
            {content.education.map((edu) => (
              <div key={edu.id} className="grid grid-cols-[140px_1fr] gap-4">
                <div className="text-xs text-gray-400">
                  <p>{edu.startDate}</p>
                  <p>{edu.endDate || "Present"}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">{edu.degree}</h3>
                  <p className="text-gray-500 text-sm">{edu.institution}</p>
                  {edu.field && <p className="text-gray-400 text-xs">{edu.field}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {content.skills && content.skills.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
            Skills
          </h2>
          <div className="grid grid-cols-[140px_1fr] gap-4">
            <div></div>
            <div className="flex flex-wrap gap-2">
              {content.skills.map((skill) => (
                <span
                  key={skill.id}
                  className="text-gray-600 text-xs"
                >
                  {skill.name}
                  {skill !== content.skills![content.skills!.length - 1] && " /"}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Projects */}
      {content.projects && content.projects.length > 0 && (
        <section>
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
            Projects
          </h2>
          <div className="space-y-4">
            {content.projects.map((project) => (
              <div key={project.id} className="grid grid-cols-[140px_1fr] gap-4">
                <div className="text-xs text-gray-400">
                  {project.url && <span>{project.url}</span>}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">{project.name}</h3>
                  {project.description && (
                    <p className="text-gray-600 mt-1 text-xs leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
