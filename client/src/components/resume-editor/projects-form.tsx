import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ResumeContent, Project } from "@shared/schema";
import { FolderKanban, Plus, Trash2 } from "lucide-react";

interface ProjectsFormProps {
  content: ResumeContent;
  onChange: (updates: Partial<ResumeContent>) => void;
}

export function ProjectsForm({ content, onChange }: ProjectsFormProps) {
  const projects = content.projects || [];

  const addProject = () => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      url: "",
      highlights: [],
    };
    onChange({ projects: [...projects, newProject] });
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    const updated = projects.map((project) =>
      project.id === id ? { ...project, ...updates } : project
    );
    onChange({ projects: updated });
  };

  const removeProject = (id: string) => {
    onChange({ projects: projects.filter((project) => project.id !== id) });
  };

  const addHighlight = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      updateProject(projectId, {
        highlights: [...(project.highlights || []), ""],
      });
    }
  };

  const updateHighlight = (projectId: string, index: number, value: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project && project.highlights) {
      const newHighlights = [...project.highlights];
      newHighlights[index] = value;
      updateProject(projectId, { highlights: newHighlights });
    }
  };

  const removeHighlight = (projectId: string, index: number) => {
    const project = projects.find((p) => p.id === projectId);
    if (project && project.highlights) {
      updateProject(projectId, {
        highlights: project.highlights.filter((_, i) => i !== index),
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderKanban className="w-5 h-5" />
            Projects
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={addProject}
            data-testid="button-add-project"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Project
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No projects added yet</p>
            <Button
              variant="link"
              onClick={addProject}
              className="mt-2"
              data-testid="button-add-first-project"
            >
              Add your first project
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className="relative p-4 border rounded-lg bg-muted/30"
                data-testid={`project-item-${index}`}
              >
                <div className="absolute top-3 right-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeProject(project.id)}
                    className="text-destructive hover:text-destructive"
                    data-testid={`button-remove-project-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Project Name *</Label>
                    <Input
                      value={project.name}
                      onChange={(e) =>
                        updateProject(project.id, { name: e.target.value })
                      }
                      placeholder="Project Name"
                      data-testid={`input-project-name-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={project.url}
                      onChange={(e) =>
                        updateProject(project.id, { url: e.target.value })
                      }
                      placeholder="github.com/username/project"
                      data-testid={`input-project-url-${index}`}
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <Label>Description</Label>
                  <Textarea
                    value={project.description}
                    onChange={(e) =>
                      updateProject(project.id, { description: e.target.value })
                    }
                    placeholder="Brief description of the project..."
                    className="min-h-[80px] resize-none"
                    data-testid={`input-project-description-${index}`}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Key Features / Technologies</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addHighlight(project.id)}
                      data-testid={`button-add-project-highlight-${index}`}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {project.highlights && project.highlights.length > 0 && (
                    <div className="space-y-2">
                      {project.highlights.map((highlight, hIndex) => (
                        <div key={hIndex} className="flex gap-2">
                          <Input
                            value={highlight}
                            onChange={(e) =>
                              updateHighlight(project.id, hIndex, e.target.value)
                            }
                            placeholder="React, Node.js, PostgreSQL"
                            data-testid={`input-project-highlight-${index}-${hIndex}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeHighlight(project.id, hIndex)}
                            className="flex-shrink-0"
                            data-testid={`button-remove-project-highlight-${index}-${hIndex}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
