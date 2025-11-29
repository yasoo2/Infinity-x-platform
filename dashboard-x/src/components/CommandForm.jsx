  import React from 'react';
  import PropTypes from 'prop-types';
  import { useForm } from 'react-hook-form';
  import { zodResolver } from '@hookform/resolvers/zod';
  import * as z from 'zod';
  import { Send, Volume2, Globe, MessageSquareText, Loader2 } from 'lucide-react';

  import { Button } from "@/components/ui/button";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Switch } from "@/components/ui/switch";
  import { Textarea } from "@/components/ui/textarea"; // استخدام Textarea من shadcn/ui
  import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from "@/components/ui/form";

  // تعريف مخطط التحقق باستخدام Zod
  const formSchema = z.object({
    commandText: z.string().min(1, {
      message: "يجب ألا يكون الأمر فارغًا.",
    }),
    lang: z.enum(["ar", "en"], {
      required_error: "الرجاء تحديد لغة.",
    }),
    voice: z.boolean().default(false),
  });

  export default function CommandForm({ onSubmit, loading }) {
    const form = useForm({
      resolver: zodResolver(formSchema),
      defaultValues: {
        commandText: "",
        lang: "ar",
        voice: false,
      },
    });

    const handleSubmit = (values) => {
      onSubmit(values);
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-6 bg-cardDark rounded-lg shadow-lg border border-gray-700">
          <FormField
            control={form.control}
            name="commandText"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-textDim flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4" />
                  الأمر إلى جو / النظام
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="أدخل أمرك باللغة العربية أو الإنجليزية..."
                    className="min-h-[150px] resize-y bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus-visible:ring-yellow-500"
                    disabled={loading}
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-gray-400">
                  أدخل الأمر الذي تريد إرساله إلى النظام.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="lang"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-textDim flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    اللغة
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                    <FormControl>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white focus:ring-neonGreen">
                        <SelectValue placeholder="اختر لغة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-800 border-gray-600 text-white">
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">الإنجليزية</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-gray-400">
                    اللغة التي سيتم بها تفسير الأمر.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="voice"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-4 bg-gray-800 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-textDim flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      استجابة صوتية
                    </FormLabel>
                    <FormDescription className="text-gray-400">
                      تفعيل الاستجابة الصوتية من النظام.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={loading}
                      className="data-[state=checked]:bg-neonGreen data-[state=unchecked]:bg-gray-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading}
              className="bg-neonGreen hover:bg-neonGreen/90 text-gray-900 font-bold py-2 px-6 rounded-md transition-colors duration-200 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  إرسال الأمر
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    );
  }

  CommandForm.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    loading: PropTypes.bool,
  };
