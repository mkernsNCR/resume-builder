import type { ResumeContent } from "@shared/schema";
import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

interface ModernTemplateProps {
  content: ResumeContent;
}

export function ModernTemplate({ content }: ModernTemplateProps) {
  return (
    <div className="resume-preview bg-white p-8 w-[816px] h-[1056px] overflow-hidden" style={{ aspectRatio: '8.5 / 11' }}>
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          {content.fullName || "Your Name"}
        </h1>
        {content.title && (
          <p className="text-lg text-blue-600 font-medium mb-3">{content.title}</p>
        )}
        
        {/* Contact Info */}
        {content.contact && (
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {content.contact.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {content.contact.email}
              </span>
            )}
            {content.contact.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {content.contact.phone}
              </span>
            )}
            {content.contact.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {content.contact.location}
              </span>
            )}
            {content.contact.linkedin && (
              <span className="flex items-center gap-1">
                <Linkedin className="w-3.5 h-3.5" />
                {content.contact.linkedin}
              </span>
            )}
            {content.contact.website && (
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {content.contact.website}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Summary */}
      {content.summary && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 border-b-2 border-blue-600 pb-1 mb-3">
            Professional Summary
          </h2>
          <p className="text-gray-700 leading-relaxed">{content.summary}</p>
        </section>
      )}

      {/* Experience */}
      {content.experience && content.experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 border-b-2 border-blue-600 pb-1 mb-3">
            Work Experience
          </h2>
          <div className="space-y-4">
            {content.experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                    <p className="text-blue-600 font-medium">{exp.company}</p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {exp.startDate} - {exp.current ? "Present" : exp.endDate}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-gray-700 mt-1">{exp.description}</p>
                )}
                {exp.highlights && exp.highlights.length > 0 && (
                  <ul className="list-disc list-inside mt-2 text-gray-700 space-y-1">
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
          <h2 className="text-lg font-semibold text-gray-800 border-b-2 border-blue-600 pb-1 mb-3">
            Education
          </h2>
          <div className="space-y-3">
            {content.education.map((edu) => (
              <div key={edu.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{edu.degree}</h3>
                    <p className="text-blue-600">{edu.institution}</p>
                    {edu.field && <p className="text-gray-600 text-sm">{edu.field}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">
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
          <h2 className="text-lg font-semibold text-gray-800 border-b-2 border-blue-600 pb-1 mb-3">
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {content.skills.map((skill) => (
              <span
                key={skill.id}
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {content.projects && content.projects.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 border-b-2 border-blue-600 pb-1 mb-3">
            Projects
          </h2>
          <div className="space-y-3">
            {content.projects.map((project) => (
              <div key={project.id}>
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  {project.url && (
                    <span className="text-sm text-blue-600">{project.url}</span>
                  )}
                </div>
                {project.description && (
                  <p className="text-gray-700 mt-1">{project.description}</p>
                )}
                {project.highlights && project.highlights.length > 0 && (
                  <ul className="list-disc list-inside mt-2 text-gray-700 space-y-1">
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
