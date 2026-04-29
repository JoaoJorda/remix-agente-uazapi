import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, User, UserPlus, Phone, Mail, Building } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Button } from './Button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '../lib/utils';
import { api } from '../services/api';
import { Contact, TeamMember } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Schema para contato existente
const existingContactSchema = z.object({
  contact_mode: z.literal('existing'),
  contact_id: z.string().min(1, { message: 'Selecione um contato' }),
  new_contact_name: z.string().optional(),
  new_contact_phone: z.string().optional(),
  new_contact_email: z.string().optional(),
  title: z.string()
    .trim()
    .min(3, { message: 'Título deve ter no mínimo 3 caracteres' })
    .max(100, { message: 'Título deve ter no máximo 100 caracteres' }),
  company: z.string()
    .trim()
    .max(100, { message: 'Empresa deve ter no máximo 100 caracteres' })
    .optional(),
  value: z.coerce.number()
    .min(0, { message: 'Valor deve ser positivo' })
    .max(999999999, { message: 'Valor muito alto' })
    .default(0),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  tags: z.string()
    .max(500, { message: 'Tags muito longas' })
    .optional(),
  due_date: z.date().optional(),
  owner_id: z.string().optional(),
});

// Schema para novo contato
const newContactSchema = z.object({
  contact_mode: z.literal('new'),
  contact_id: z.string().optional(),
  new_contact_name: z.string()
    .trim()
    .min(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
    .max(100, { message: 'Nome deve ter no máximo 100 caracteres' }),
  new_contact_phone: z.string()
    .trim()
    .min(10, { message: 'Telefone inválido' })
    .max(20, { message: 'Telefone muito longo' })
    .regex(/^[\d\s\+\-\(\)]+$/, { message: 'Telefone deve conter apenas números' }),
  new_contact_email: z.string()
    .trim()
    .email({ message: 'Email inválido' })
    .optional()
    .or(z.literal('')),
  title: z.string()
    .trim()
    .min(3, { message: 'Título deve ter no mínimo 3 caracteres' })
    .max(100, { message: 'Título deve ter no máximo 100 caracteres' }),
  company: z.string()
    .trim()
    .max(100, { message: 'Empresa deve ter no máximo 100 caracteres' })
    .optional(),
  value: z.coerce.number()
    .min(0, { message: 'Valor deve ser positivo' })
    .max(999999999, { message: 'Valor muito alto' })
    .default(0),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  tags: z.string()
    .max(500, { message: 'Tags muito longas' })
    .optional(),
  due_date: z.date().optional(),
  owner_id: z.string().optional(),
});

const dealFormSchema = z.discriminatedUnion('contact_mode', [
  existingContactSchema,
  newContactSchema,
]);

type DealFormValues = z.infer<typeof dealFormSchema>;

interface CreateDealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDealCreated: () => void;
}

export const CreateDealModal: React.FC<CreateDealModalProps> = ({
  open,
  onOpenChange,
  onDealCreated,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactMode, setContactMode] = useState<'existing' | 'new'>('existing');

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      contact_mode: 'existing',
      title: '',
      company: '',
      value: 0,
      priority: 'medium',
      tags: '',
      new_contact_name: '',
      new_contact_phone: '',
      new_contact_email: '',
    },
  });

  useEffect(() => {
    if (open) {
      const loadData = async () => {
        try {
          const [contactsData, teamData] = await Promise.all([
            api.fetchContacts(),
            api.fetchTeam(),
          ]);
          setContacts(contactsData);
          setTeamMembers(teamData);
        } catch (error) {
          console.error('Error loading data:', error);
        }
      };
      loadData();
    }
  }, [open]);

  const handleTabChange = (value: string) => {
    const mode = value as 'existing' | 'new';
    setContactMode(mode);
    form.setValue('contact_mode', mode);
  };

  const onSubmit = async (data: DealFormValues) => {
    setIsSubmitting(true);
    try {
      let contactId = data.contact_mode === 'existing' ? data.contact_id : '';

      if (data.contact_mode === 'new') {
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone_number', data.new_contact_phone)
          .maybeSingle();

        if (existingContact) {
          toast.error('Já existe um contato com este telefone');
          setIsSubmitting(false);
          return;
        }

        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            name: data.new_contact_name,
            phone_number: data.new_contact_phone,
            email: data.new_contact_email || null,
          })
          .select('id')
          .single();

        if (contactError || !newContact) {
          console.error('Error creating contact:', contactError);
          toast.error('Erro ao criar contato');
          setIsSubmitting(false);
          return;
        }

        contactId = newContact.id;
        toast.success('Contato criado com sucesso!');

        await supabase
          .from('deals')
          .delete()
          .eq('contact_id', contactId);
      }

      const tagsArray = data.tags
        ? data.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : [];

      await api.createDeal({
        contact_id: contactId,
        title: data.title,
        company: data.company,
        value: data.value,
        stage: 'new',
        priority: data.priority,
        tags: tagsArray,
        due_date: data.due_date ? format(data.due_date, 'yyyy-MM-dd') : undefined,
        owner_id: data.owner_id,
      });

      toast.success('Deal criado com sucesso!');
      form.reset();
      setContactMode('existing');
      onOpenChange(false);
      onDealCreated();
    } catch (error) {
      console.error('Error creating deal:', error);
      toast.error('Erro ao criar deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Criar Novo Deal
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Preencha as informações para criar uma nova oportunidade no pipeline.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={contactMode} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted p-1">
                <TabsTrigger 
                  value="existing" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Contato Existente
                </TabsTrigger>
                <TabsTrigger 
                  value="new"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Novo Contato
                </TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="mt-4 space-y-4">
                <FormField
                  control={form.control}
                  name="contact_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Contato *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary focus:border-primary">
                            <SelectValue placeholder="Selecione um contato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card border-border">
                          {contacts.map((contact) => (
                            <SelectItem 
                              key={contact.id} 
                              value={contact.id}
                              className="text-foreground focus:bg-primary focus:text-primary-foreground"
                            >
                              <div className="flex items-center gap-2">
                                <span>{contact.name || contact.phone || 'Sem nome'}</span>
                                {contact.phone && contact.name && (
                                  <span className="text-muted-foreground text-xs">({contact.phone})</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-muted-foreground">
                        Cliente ou lead associado a esta oportunidade
                      </FormDescription>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="new" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="new_contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          Nome *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nome do contato"
                            className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-destructive" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="new_contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground flex items-center gap-2">
                          <Phone className="w-4 h-4 text-primary" />
                          Telefone *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+55 11 99999-9999"
                            className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-muted-foreground">
                          Formato WhatsApp com código do país
                        </FormDescription>
                        <FormMessage className="text-destructive" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="new_contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        Email (opcional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@exemplo.com"
                          className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                Informações do Deal
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Título *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Venda Premium..."
                          className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Empresa</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome da empresa"
                          className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Valor (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary focus:border-primary">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="low" className="text-foreground focus:bg-primary focus:text-primary-foreground">Baixa</SelectItem>
                          <SelectItem value="medium" className="text-foreground focus:bg-primary focus:text-primary-foreground">Média</SelectItem>
                          <SelectItem value="high" className="text-foreground focus:bg-primary focus:text-primary-foreground">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-foreground">Data Prevista</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal bg-background border-border hover:bg-muted focus:ring-primary',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy')
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription className="text-muted-foreground">
                        Previsão de fechamento
                      </FormDescription>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="owner_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Responsável</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary focus:border-primary">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card border-border">
                          {teamMembers.map((member) => (
                            <SelectItem 
                              key={member.id} 
                              value={member.id}
                              className="text-foreground focus:bg-primary focus:text-primary-foreground"
                            >
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Tags</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: premium, urgente (separadas por vírgula)"
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-muted-foreground">
                      Separe múltiplas tags com vírgula
                    </FormDescription>
                    <FormMessage className="text-destructive" />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="bg-muted hover:bg-muted/80 text-foreground border-border"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              >
                {isSubmitting ? 'Criando...' : contactMode === 'new' ? 'Criar Contato e Deal' : 'Criar Deal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
