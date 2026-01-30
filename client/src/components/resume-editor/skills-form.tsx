import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ResumeContent, Skill } from "@shared/schema";
import { Sparkles, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SkillsFormProps {
  content: ResumeContent;
  onChange: (updates: Partial<ResumeContent>) => void;
}

export function SkillsForm({ content, onChange }: SkillsFormProps) {
  const skills = content.skills || [];

  const addSkill = (name: string) => {
    if (!name.trim()) return;
    const newSkill: Skill = {
      id: crypto.randomUUID(),
      name: name.trim(),
      level: "intermediate",
    };
    onChange({ skills: [...skills, newSkill] });
  };

  const updateSkill = (id: string, updates: Partial<Skill>) => {
    const updated = skills.map((skill) =>
      skill.id === id ? { ...skill, ...updates } : skill
    );
    onChange({ skills: updated });
  };

  const removeSkill = (id: string) => {
    onChange({ skills: skills.filter((skill) => skill.id !== id) });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const input = e.currentTarget;
      addSkill(input.value);
      input.value = "";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Skills
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Add Skill</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Type a skill and press Enter"
                onKeyDown={handleKeyDown}
                data-testid="input-add-skill"
              />
              <Button
                variant="outline"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  if (input) {
                    addSkill(input.value);
                    input.value = "";
                  }
                }}
                data-testid="button-add-skill"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {skills.length > 0 && (
            <div className="space-y-3">
              <Label>Your Skills</Label>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <Badge
                    key={skill.id}
                    variant="secondary"
                    className="px-3 py-1.5 text-sm flex items-center gap-2"
                    data-testid={`skill-badge-${index}`}
                  >
                    <span>{skill.name}</span>
                    <Select
                      value={skill.level}
                      onValueChange={(value) =>
                        updateSkill(skill.id, {
                          level: value as Skill["level"],
                        })
                      }
                    >
                      <SelectTrigger className="h-5 w-24 text-xs border-0 bg-transparent p-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => removeSkill(skill.id)}
                      className="ml-1 hover:text-destructive transition-colors"
                      data-testid={`button-remove-skill-${index}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {skills.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">
                Add skills to showcase your expertise
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
