import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ResumeContent, Education } from "@shared/schema";
import { GraduationCap, Plus, Trash2 } from "lucide-react";

interface EducationFormProps {
  content: ResumeContent;
  onChange: (updates: Partial<ResumeContent>) => void;
}

export function EducationForm({ content, onChange }: EducationFormProps) {
  const educationList = content.education || [];

  const addEducation = () => {
    const newEdu: Education = {
      id: crypto.randomUUID(),
      institution: "",
      degree: "",
      field: "",
      startDate: "",
      endDate: "",
      gpa: "",
      highlights: [],
    };
    onChange({ education: [...educationList, newEdu] });
  };

  const updateEducation = (id: string, updates: Partial<Education>) => {
    const updated = educationList.map((edu) =>
      edu.id === id ? { ...edu, ...updates } : edu
    );
    onChange({ education: updated });
  };

  const removeEducation = (id: string) => {
    onChange({ education: educationList.filter((edu) => edu.id !== id) });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Education
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={addEducation}
            data-testid="button-add-education"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Education
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {educationList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No education added yet</p>
            <Button
              variant="ghost"
              onClick={addEducation}
              className="mt-2"
              data-testid="button-add-first-education"
            >
              Add your education
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {educationList.map((edu, index) => (
              <div
                key={edu.id}
                className="relative p-4 border rounded-lg bg-muted/30"
                data-testid={`education-item-${index}`}
              >
                <div className="absolute top-3 right-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEducation(edu.id)}
                    className="text-destructive hover:text-destructive"
                    data-testid={`button-remove-education-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Institution *</Label>
                    <Input
                      value={edu.institution}
                      onChange={(e) =>
                        updateEducation(edu.id, { institution: e.target.value })
                      }
                      placeholder="University Name"
                      data-testid={`input-institution-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Degree *</Label>
                    <Input
                      value={edu.degree}
                      onChange={(e) =>
                        updateEducation(edu.id, { degree: e.target.value })
                      }
                      placeholder="Bachelor of Science"
                      data-testid={`input-degree-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Field of Study</Label>
                    <Input
                      value={edu.field}
                      onChange={(e) =>
                        updateEducation(edu.id, { field: e.target.value })
                      }
                      placeholder="Computer Science"
                      data-testid={`input-field-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GPA</Label>
                    <Input
                      value={edu.gpa}
                      onChange={(e) =>
                        updateEducation(edu.id, { gpa: e.target.value })
                      }
                      placeholder="3.8/4.0"
                      data-testid={`input-gpa-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      value={edu.startDate}
                      onChange={(e) =>
                        updateEducation(edu.id, { startDate: e.target.value })
                      }
                      placeholder="Sep 2018"
                      data-testid={`input-edu-start-date-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      value={edu.endDate}
                      onChange={(e) =>
                        updateEducation(edu.id, { endDate: e.target.value })
                      }
                      placeholder="May 2022"
                      data-testid={`input-edu-end-date-${index}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
