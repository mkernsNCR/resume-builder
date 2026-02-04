import type { ResumeContent } from "@shared/schema";
import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

interface CreativeTemplateProps {
  content: ResumeContent;
  allowOverflow?: boolean;
}

export function CreativeTemplate({ content, allowOverflow = false }: CreativeTemplateProps) {
  return (
    <div 
      className={`resume-preview bg-white w-[816px] flex ${allowOverflow ? '' : 'h-[1056px] overflow-hidden'}`}
      style={allowOverflow ? undefined : { aspectRatio: '8.5 / 11' }}
    >
      {/* Left Sidebar - 508 Compliant with WCAG 2.1 AA contrast ratios */}
      <aside className="w-[240px] bg-slate-800 text-white p-6 flex-shrink-0">
        {/* Name and Title */}
        <div className="mb-8">
          <h1 className="text-xl font-bold leading-tight" style={{ color: '#ffffff' }}>
            {content.fullName || "Your Name"}
          </h1>
          {content.title && (
            <p className="text-emerald-300 text-sm mt-2 font-medium">
              {content.title}
            </p>
          )}
        </div>

        {/* Contact */}
        {content.contact && (
          <div className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-3">
              Contact
            </h2>
            <div className="space-y-2 text-sm">
              {content.contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                  <span className="text-white text-xs break-all">
                    {content.contact.email}
                  </span>
                </div>
              )}
              {content.contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                  <span className="text-white text-xs">{content.contact.phone}</span>
                </div>
              )}
              {content.contact.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                  <span className="text-white text-xs">{content.contact.location}</span>
                </div>
              )}
              {content.contact.linkedin && (
                <div className="flex items-center gap-2">
                  <Linkedin className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                  <span className="text-white text-xs break-all">
                    {content.contact.linkedin}
                  </span>
                </div>
              )}
              {content.contact.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                  <span className="text-white text-xs break-all">
                    {content.contact.website}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Skills */}
        {content.skills && content.skills.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-3">
              Skills
            </h2>
            <div className="space-y-2">
              {content.skills.map((skill) => (
                <div key={skill.id}>
                  <span className="text-white text-xs">{skill.name}</span>
                  {skill.level && (
                    <div className="mt-1 h-1.5 bg-slate-600 rounded-full overflow-hidden" role="progressbar" aria-label={`${skill.name} skill level`}>
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{
                          width:
                            skill.level === "beginner"
                              ? "25%"
                              : skill.level === "intermediate"
                              ? "50%"
                              : skill.level === "advanced"
                              ? "75%"
                              : "100%",
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {content.education && content.education.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-3">
              Education
            </h2>
            <div className="space-y-3">
              {content.education.map((edu) => (
                <div key={edu.id}>
                  <h3 className="text-white text-xs font-semibold">
                    {edu.degree}
                  </h3>
                  <p className="text-slate-200 text-xs">{edu.institution}</p>
                  <p className="text-slate-300 text-xs mt-1">
                    {edu.startDate} - {edu.endDate || "Present"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content - 508 Compliant */}
      <main className="flex-1 p-6 bg-white">
        {/* Summary */}
        {content.summary && (
          <section className="mb-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-emerald-600" aria-hidden="true"></span>
              About Me
            </h2>
            <p className="text-gray-700 leading-relaxed text-sm">
              {content.summary}
            </p>
          </section>
        )}

        {/* Experience */}
        {content.experience && content.experience.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-emerald-600" aria-hidden="true"></span>
              Experience
            </h2>
            <div className="space-y-4">
              {content.experience.map((exp) => (
                <div key={exp.id} className="relative pl-4 border-l-2 border-emerald-300">
                  <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-emerald-600" aria-hidden="true" />
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">
                        {exp.position}
                      </h3>
                      <p className="text-emerald-700 text-sm font-medium">
                        {exp.company}
                      </p>
                    </div>
                    <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {exp.startDate} - {exp.current ? "Present" : exp.endDate}
                    </span>
                  </div>
                  {exp.description && (
                    <p className="text-gray-700 mt-2 text-xs leading-relaxed">
                      {exp.description}
                    </p>
                  )}
                  {exp.highlights && exp.highlights.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.highlights.map((highlight, idx) => (
                        <li
                          key={idx}
                          className="text-gray-700 text-xs flex items-start gap-2"
                        >
                          <span className="text-emerald-600 mt-0.5" aria-hidden="true">•</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {content.projects && content.projects.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-emerald-600" aria-hidden="true"></span>
              Projects
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {content.projects.map((project) => (
                <div
                  key={project.id}
                  className="p-3 bg-slate-50 rounded border border-slate-200"
                >
                  <h3 className="font-semibold text-slate-900 text-sm">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-gray-700 mt-1 text-xs leading-relaxed">
                      {project.description}
                    </p>
                  )}
                  {project.url && (
                    <p className="text-emerald-700 text-xs mt-2 font-medium">{project.url}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
