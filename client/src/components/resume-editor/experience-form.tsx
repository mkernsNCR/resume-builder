import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ResumeContent, WorkExperience } from "@shared/schema";
import { Briefcase, Plus, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ExperienceFormProps {
  content: ResumeContent;
  onChange: (updates: Partial<ResumeContent>) => void;
}

interface SortableExperienceItemProps {
  exp: WorkExperience;
  index: number;
  updateExperience: (id: string, updates: Partial<WorkExperience>) => void;
  removeExperience: (id: string) => void;
  addHighlight: (expId: string) => void;
  updateHighlight: (expId: string, index: number, value: string) => void;
  removeHighlight: (expId: string, index: number) => void;
}

function SortableExperienceItem({
  exp,
  index,
  updateExperience,
  removeExperience,
  addHighlight,
  updateHighlight,
  removeHighlight,
}: SortableExperienceItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exp.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative p-4 border rounded-lg bg-muted/30"
      data-testid={`experience-item-${index}`}
    >
      <div className="absolute top-3 left-3 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="absolute top-3 right-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeExperience(exp.id)}
          className="text-destructive hover:text-destructive"
          data-testid={`button-remove-experience-${index}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pl-6">
        <div className="space-y-2">
          <Label>Company *</Label>
          <Input
            value={exp.company}
            onChange={(e) =>
              updateExperience(exp.id, { company: e.target.value })
            }
            placeholder="Company Name"
            data-testid={`input-company-${index}`}
          />
        </div>
        <div className="space-y-2">
          <Label>Position *</Label>
          <Input
            value={exp.position}
            onChange={(e) =>
              updateExperience(exp.id, { position: e.target.value })
            }
            placeholder="Job Title"
            data-testid={`input-position-${index}`}
          />
        </div>
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
            value={exp.startDate}
            onChange={(e) =>
              updateExperience(exp.id, { startDate: e.target.value })
            }
            placeholder="Jan 2020"
            data-testid={`input-start-date-${index}`}
          />
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <div className="flex gap-3 items-center">
            <Input
              value={exp.current ? "" : exp.endDate}
              onChange={(e) =>
                updateExperience(exp.id, { endDate: e.target.value })
              }
              placeholder="Dec 2023"
              disabled={exp.current}
              data-testid={`input-end-date-${index}`}
            />
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Checkbox
                id={`current-${exp.id}`}
                checked={exp.current}
                onCheckedChange={(checked) =>
                  updateExperience(exp.id, {
                    current: checked === true,
                    endDate: checked ? "" : exp.endDate,
                  })
                }
                data-testid={`checkbox-current-${index}`}
              />
              <Label htmlFor={`current-${exp.id}`} className="text-sm">
                Current
              </Label>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4 pl-6">
        <Label>Description</Label>
        <Textarea
          value={exp.description}
          onChange={(e) =>
            updateExperience(exp.id, { description: e.target.value })
          }
          placeholder="Brief overview of your role and responsibilities..."
          className="min-h-[80px] resize-none"
          data-testid={`input-description-${index}`}
        />
      </div>

      <div className="space-y-2 pl-6">
        <div className="flex items-center justify-between">
          <Label>Key Achievements</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addHighlight(exp.id)}
            data-testid={`button-add-highlight-${index}`}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </div>
        {exp.highlights && exp.highlights.length > 0 && (
          <div className="space-y-2">
            {exp.highlights.map((highlight, hIndex) => (
              <div key={hIndex} className="flex gap-2">
                <Input
                  value={highlight}
                  onChange={(e) =>
                    updateHighlight(exp.id, hIndex, e.target.value)
                  }
                  placeholder="Achieved X by doing Y resulting in Z"
                  data-testid={`input-highlight-${index}-${hIndex}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeHighlight(exp.id, hIndex)}
                  className="flex-shrink-0"
                  data-testid={`button-remove-highlight-${index}-${hIndex}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ExperienceForm({ content, onChange }: ExperienceFormProps) {
  const experiences = content.experience || [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = experiences.findIndex((exp) => exp.id === active.id);
      const newIndex = experiences.findIndex((exp) => exp.id === over.id);
      onChange({ experience: arrayMove(experiences, oldIndex, newIndex) });
    }
  };

  const addExperience = () => {
    const newExp: WorkExperience = {
      id: crypto.randomUUID(),
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
      highlights: [],
    };
    onChange({ experience: [...experiences, newExp] });
  };

  const updateExperience = (id: string, updates: Partial<WorkExperience>) => {
    const updated = experiences.map((exp) =>
      exp.id === id ? { ...exp, ...updates } : exp
    );
    onChange({ experience: updated });
  };

  const removeExperience = (id: string) => {
    onChange({ experience: experiences.filter((exp) => exp.id !== id) });
  };

  const addHighlight = (expId: string) => {
    const exp = experiences.find((e) => e.id === expId);
    if (exp) {
      updateExperience(expId, {
        highlights: [...(exp.highlights || []), ""],
      });
    }
  };

  const updateHighlight = (expId: string, index: number, value: string) => {
    const exp = experiences.find((e) => e.id === expId);
    if (exp && exp.highlights) {
      const newHighlights = [...exp.highlights];
      newHighlights[index] = value;
      updateExperience(expId, { highlights: newHighlights });
    }
  };

  const removeHighlight = (expId: string, index: number) => {
    const exp = experiences.find((e) => e.id === expId);
    if (exp && exp.highlights) {
      updateExperience(expId, {
        highlights: exp.highlights.filter((_, i) => i !== index),
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Work Experience
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={addExperience}
            data-testid="button-add-experience"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Experience
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {experiences.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No work experience added yet</p>
            <Button
              variant="ghost"
              onClick={addExperience}
              className="mt-2 text-primary"
              data-testid="button-add-first-experience"
            >
              Add your first experience
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={experiences.map((exp) => exp.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {experiences.map((exp, index) => (
                  <SortableExperienceItem
                    key={exp.id}
                    exp={exp}
                    index={index}
                    updateExperience={updateExperience}
                    removeExperience={removeExperience}
                    addHighlight={addHighlight}
                    updateHighlight={updateHighlight}
                    removeHighlight={removeHighlight}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
