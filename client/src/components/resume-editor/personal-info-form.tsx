import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResumeContent } from "@shared/schema";
import { User, Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

const personalInfoSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  title: z.string().optional(),
  summary: z.string().optional(),
  email: z.string().email("Please enter a valid email").or(z.literal("")),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().optional(),
});

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;

interface PersonalInfoFormProps {
  content: ResumeContent;
  onChange: (updates: Partial<ResumeContent>) => void;
}

export function PersonalInfoForm({ content, onChange }: PersonalInfoFormProps) {
  const form = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: content.fullName || "",
      title: content.title || "",
      summary: content.summary || "",
      email: content.contact?.email || "",
      phone: content.contact?.phone || "",
      location: content.contact?.location || "",
      linkedin: content.contact?.linkedin || "",
      website: content.contact?.website || "",
    },
  });

  const handleBlur = () => {
    const values = form.getValues();
    onChange({
      fullName: values.fullName,
      title: values.title,
      summary: values.summary,
      contact: {
        email: values.email,
        phone: values.phone,
        location: values.location,
        linkedin: values.linkedin,
        website: values.website,
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="w-5 h-5" />
          Personal Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          handleBlur();
                        }}
                        data-testid="input-fullname"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Senior Software Engineer"
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          handleBlur();
                        }}
                        data-testid="input-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Professional Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief overview of your experience and skills..."
                      className="min-h-[100px] resize-none"
                      {...field}
                      onBlur={(e) => {
                        field.onBlur();
                        handleBlur();
                      }}
                      data-testid="input-summary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      Email *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          handleBlur();
                        }}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      Phone
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+1 (555) 123-4567"
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          handleBlur();
                        }}
                        data-testid="input-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      Location
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="San Francisco, CA"
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          handleBlur();
                        }}
                        data-testid="input-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linkedin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Linkedin className="w-3.5 h-3.5" />
                      LinkedIn
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="linkedin.com/in/johndoe"
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          handleBlur();
                        }}
                        data-testid="input-linkedin"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      Website / Portfolio
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="www.johndoe.com"
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          handleBlur();
                        }}
                        data-testid="input-website"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
