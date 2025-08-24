"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  DollarSign, 
  Save, 
  Send,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { Button, Input, Textarea, Select, Card, CardContent, Badge, Modal } from '@/components/ui';
import { IrrigationInspection } from '@/types/irrigation-inspection';

// Quote item schema
const quoteItemSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  laborHours: z.number().min(0, 'Labor hours must be positive'),
  laborRate: z.number().min(0, 'Labor rate must be positive'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  warranty: z.string().optional(),
  notes: z.string().optional()
});

const quoteSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Valid email is required').optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  propertyAddress: z.string().min(1, 'Property address is required'),
  items: z.array(quoteItemSchema).min(1, 'At least one item is required'),
  taxRate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100'),
  discountPercent: z.number().min(0).max(100, 'Discount must be between 0 and 100'),
  terms: z.string().optional(),
  validUntil: z.string().min(1, 'Valid until date is required'),
  notes: z.string().optional()
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface QuoteItem {
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
  laborHours: number;
  laborRate: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  warranty?: string;
  notes?: string;
}

interface Quote extends Omit<QuoteFormData, 'items'> {
  id?: string;
  items: QuoteItem[];
  subtotal: number;
  laborTotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

interface QuoteBuilderProps {
  inspection: IrrigationInspection;
  existingQuote?: Quote;
  isOpen: boolean;
  onClose: () => void;
  onSave: (quote: Quote) => Promise<void>;
  onSend: (quote: Quote) => Promise<void>;
}

// Predefined repair categories and common items
const REPAIR_CATEGORIES = [
  { id: 'sprinkler_heads', name: 'Sprinkler Heads' },
  { id: 'valves', name: 'Valves' },
  { id: 'controller', name: 'Controller' },
  { id: 'piping', name: 'Piping' },
  { id: 'backflow', name: 'Backflow Device' },
  { id: 'rain_sensor', name: 'Rain Sensor' },
  { id: 'wiring', name: 'Wiring' },
  { id: 'mainline', name: 'Main Line' },
  { id: 'other', name: 'Other' }
];

const COMMON_ITEMS = {
  sprinkler_heads: [
    { description: 'Replace spray head', unitPrice: 8.50, laborHours: 0.25 },
    { description: 'Replace rotary head', unitPrice: 15.00, laborHours: 0.3 },
    { description: 'Adjust head alignment', unitPrice: 0, laborHours: 0.15 },
    { description: 'Clean clogged heads', unitPrice: 0, laborHours: 0.2 }
  ],
  valves: [
    { description: 'Replace 1" valve', unitPrice: 35.00, laborHours: 1.0 },
    { description: 'Replace valve solenoid', unitPrice: 25.00, laborHours: 0.5 },
    { description: 'Repair valve box', unitPrice: 15.00, laborHours: 0.75 }
  ],
  controller: [
    { description: 'Replace controller (4 station)', unitPrice: 120.00, laborHours: 2.0 },
    { description: 'Replace controller (8 station)', unitPrice: 180.00, laborHours: 2.5 },
    { description: 'Program controller', unitPrice: 0, laborHours: 0.5 }
  ],
  piping: [
    { description: 'Repair pipe leak (per foot)', unitPrice: 8.00, laborHours: 0.5 },
    { description: 'Replace pipe section (per foot)', unitPrice: 12.00, laborHours: 0.75 }
  ]
};

export function QuoteBuilder({
  inspection,
  existingQuote,
  isOpen,
  onClose,
  onSave,
  onSend
}: QuoteBuilderProps) {
  const [isGeneratingItems, setIsGeneratingItems] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const defaultLaborRate = 75; // Default labor rate per hour

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      propertyAddress: inspection.propertyAddress,
      items: [],
      taxRate: 8.5,
      discountPercent: 0,
      terms: 'Payment due within 30 days. Work guaranteed for 1 year.',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      notes: ''
    }
  });

  const { fields: itemFields, append: appendItem, remove: removeItem, update: updateItem } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedItems = watch('items');
  const watchedTaxRate = watch('taxRate');
  const watchedDiscountPercent = watch('discountPercent');

  // Calculate totals
  const calculations = React.useMemo(() => {
    const subtotal = watchedItems.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0);
    
    const laborTotal = watchedItems.reduce((sum, item) => 
      sum + (item.laborHours * item.laborRate), 0);
    
    const totalBeforeDiscount = subtotal + laborTotal;
    const discountAmount = (totalBeforeDiscount * watchedDiscountPercent) / 100;
    const taxableAmount = totalBeforeDiscount - discountAmount;
    const taxAmount = (taxableAmount * watchedTaxRate) / 100;
    const total = taxableAmount + taxAmount;

    return {
      subtotal,
      laborTotal,
      totalBeforeDiscount,
      discountAmount,
      taxAmount,
      total
    };
  }, [watchedItems, watchedTaxRate, watchedDiscountPercent]);

  // Auto-generate quote items from inspection findings
  const generateQuoteItems = () => {
    setIsGeneratingItems(true);
    
    const newItems: QuoteItem[] = [];

    // Generate items from zone inspections
    inspection.zones?.forEach((zone, index) => {
      const brokenHeads = zone.brokenHeads || 0;
      const missingHeads = zone.missingHeads || 0;
      const cloggedHeads = zone.cloggedHeads || 0;
      const misalignedHeads = zone.misalignedHeads || 0;

      if (brokenHeads > 0) {
        newItems.push({
          category: 'sprinkler_heads',
          description: `Replace ${brokenHeads} broken ${zone.sprinklerType} heads in Zone ${zone.zoneNumber}`,
          quantity: brokenHeads,
          unitPrice: zone.sprinklerType === 'rotary' ? 15.00 : 8.50,
          laborHours: brokenHeads * 0.25,
          laborRate: defaultLaborRate,
          priority: 'medium'
        });
      }

      if (missingHeads > 0) {
        newItems.push({
          category: 'sprinkler_heads',
          description: `Install ${missingHeads} missing ${zone.sprinklerType} heads in Zone ${zone.zoneNumber}`,
          quantity: missingHeads,
          unitPrice: zone.sprinklerType === 'rotary' ? 15.00 : 8.50,
          laborHours: missingHeads * 0.3,
          laborRate: defaultLaborRate,
          priority: 'high'
        });
      }

      if (cloggedHeads > 0) {
        newItems.push({
          category: 'sprinkler_heads',
          description: `Clean ${cloggedHeads} clogged heads in Zone ${zone.zoneNumber}`,
          quantity: cloggedHeads,
          unitPrice: 0,
          laborHours: cloggedHeads * 0.2,
          laborRate: defaultLaborRate,
          priority: 'medium'
        });
      }

      if (misalignedHeads > 0) {
        newItems.push({
          category: 'sprinkler_heads',
          description: `Adjust ${misalignedHeads} misaligned heads in Zone ${zone.zoneNumber}`,
          quantity: misalignedHeads,
          unitPrice: 0,
          laborHours: misalignedHeads * 0.15,
          laborRate: defaultLaborRate,
          priority: 'low'
        });
      }

      if (zone.valveCondition === 'poor' || zone.valveCondition === 'failed') {
        newItems.push({
          category: 'valves',
          description: `Replace valve for Zone ${zone.zoneNumber}`,
          quantity: 1,
          unitPrice: 35.00,
          laborHours: 1.0,
          laborRate: defaultLaborRate,
          priority: zone.valveCondition === 'failed' ? 'urgent' : 'high'
        });
      }
    });

    // Generate items from controller issues
    if (inspection.controller.condition === 'poor' || inspection.controller.condition === 'failed') {
      const zoneCount = inspection.zones?.length || 4;
      const controllerPrice = zoneCount <= 4 ? 120 : zoneCount <= 8 ? 180 : 250;
      
      newItems.push({
        category: 'controller',
        description: `Replace ${zoneCount}-zone irrigation controller`,
        quantity: 1,
        unitPrice: controllerPrice,
        laborHours: zoneCount <= 4 ? 2.0 : 2.5,
        laborRate: defaultLaborRate,
        priority: inspection.controller.condition === 'failed' ? 'urgent' : 'high'
      });
    }

    // Generate items from backflow device issues
    if (inspection.backflowDevice && 
        (inspection.backflowDevice.condition === 'poor' || inspection.backflowDevice.condition === 'failed')) {
      newItems.push({
        category: 'backflow',
        description: `Replace ${inspection.backflowDevice.size}" ${inspection.backflowDevice.type.toUpperCase()} backflow device`,
        quantity: 1,
        unitPrice: 450.00,
        laborHours: 4.0,
        laborRate: defaultLaborRate,
        priority: 'high'
      });
    }

    // Generate items from main line issues
    if (inspection.mainLine.leaks && inspection.mainLine.leaks.length > 0) {
      inspection.mainLine.leaks.forEach((leak, index) => {
        const severity = leak.severity;
        const laborMultiplier = severity === 'major' ? 2.0 : severity === 'moderate' ? 1.5 : 1.0;
        
        newItems.push({
          category: 'piping',
          description: `Repair ${severity} main line leak - ${leak.location}`,
          quantity: 1,
          unitPrice: 50.00,
          laborHours: 2.0 * laborMultiplier,
          laborRate: defaultLaborRate,
          priority: severity === 'major' ? 'urgent' : 'high'
        });
      });
    }

    // Clear existing items and add generated ones
    // Reset form items
    setValue('items', []);
    
    // Add generated items one by one
    newItems.forEach(item => {
      appendItem(item);
    });

    setIsGeneratingItems(false);
  };

  const addCustomItem = () => {
    appendItem({
      category: 'other',
      description: '',
      quantity: 1,
      unitPrice: 0,
      laborHours: 0,
      laborRate: defaultLaborRate,
      priority: 'medium'
    });
  };

  const addCommonItem = (category: string, commonItem: any) => {
    appendItem({
      category,
      description: commonItem.description,
      quantity: 1,
      unitPrice: commonItem.unitPrice,
      laborHours: commonItem.laborHours,
      laborRate: defaultLaborRate,
      priority: 'medium'
    });
  };

  const onFormSubmit = async (data: QuoteFormData) => {
    const quote: Quote = {
      ...data,
      id: existingQuote?.id || crypto.randomUUID(),
      subtotal: calculations.subtotal,
      laborTotal: calculations.laborTotal,
      discountAmount: calculations.discountAmount,
      taxAmount: calculations.taxAmount,
      total: calculations.total,
      status: 'draft',
      createdAt: existingQuote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await onSave(quote);
  };

  const handleSendQuote = async () => {
    const data = watch();
    const quote: Quote = {
      ...data,
      id: existingQuote?.id || crypto.randomUUID(),
      subtotal: calculations.subtotal,
      laborTotal: calculations.laborTotal,
      discountAmount: calculations.discountAmount,
      taxAmount: calculations.taxAmount,
      total: calculations.total,
      status: 'sent',
      createdAt: existingQuote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await onSend(quote);
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      urgent: 'destructive',
      high: 'warning',
      medium: 'secondary',
      low: 'outline'
    } as const;

    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'secondary'}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <div className="p-6 max-h-screen overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Quote Builder</h2>
              <p className="text-sm text-gray-600">
                Create repair quote from inspection findings
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardContent className="space-y-4">
                <h3 className="text-lg font-semibold">Customer Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name *
                    </label>
                    <Input
                      {...register('customerName')}
                      placeholder="Full name"
                      error={errors.customerName?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      {...register('customerEmail')}
                      placeholder="customer@email.com"
                      error={errors.customerEmail?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <Input
                      {...register('customerPhone')}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Address *
                  </label>
                  <Input
                    {...register('propertyAddress')}
                    placeholder="Full property address"
                    error={errors.propertyAddress?.message}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quote Items */}
            <Card>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Quote Items</h3>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateQuoteItems}
                      disabled={isGeneratingItems}
                      size="sm"
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      {isGeneratingItems ? 'Generating...' : 'Auto Generate'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCustomItem}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>

                {itemFields.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-4">No items added yet</p>
                    <div className="flex justify-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateQuoteItems}
                        size="sm"
                      >
                        Auto Generate from Inspection
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addCustomItem}
                        size="sm"
                      >
                        Add Manual Item
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {itemFields.map((field, index) => (
                      <div key={field.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex space-x-2">
                            {getPriorityBadge(watch(`items.${index}.priority`))}
                            <Badge variant="outline">
                              {REPAIR_CATEGORIES.find(c => c.id === watch(`items.${index}.category`))?.name}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Category *
                            </label>
                            <Select {...register(`items.${index}.category`)}>
                              {REPAIR_CATEGORIES.map(category => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </Select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Priority *
                            </label>
                            <Select {...register(`items.${index}.priority`)}>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description *
                          </label>
                          <Textarea
                            {...register(`items.${index}.description`)}
                            placeholder="Detailed description of work to be performed"
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity *
                            </label>
                            <Input
                              type="number"
                              {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                              placeholder="1"
                              min="1"
                              step="1"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Unit Price *
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                              <Input
                                type="number"
                                {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="pl-10"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Labor Hours *
                            </label>
                            <Input
                              type="number"
                              {...register(`items.${index}.laborHours`, { valueAsNumber: true })}
                              placeholder="0.0"
                              min="0"
                              step="0.25"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Labor Rate *
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                              <Input
                                type="number"
                                {...register(`items.${index}.laborRate`, { valueAsNumber: true })}
                                placeholder="75.00"
                                min="0"
                                step="0.01"
                                className="pl-10"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Warranty Period
                            </label>
                            <Input
                              {...register(`items.${index}.warranty`)}
                              placeholder="e.g., 1 year parts and labor"
                            />
                          </div>

                          <div className="text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Item Total
                            </label>
                            <div className="text-lg font-semibold">
                              ${((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitPrice || 0) + 
                                 (watchedItems[index]?.laborHours || 0) * (watchedItems[index]?.laborRate || 0)).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {watchedItems[index]?.notes !== undefined && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Item Notes
                            </label>
                            <Textarea
                              {...register(`items.${index}.notes`)}
                              placeholder="Additional notes for this item..."
                              rows={2}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quote Settings */}
            <Card>
              <CardContent className="space-y-4">
                <h3 className="text-lg font-semibold">Quote Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Rate (%) *
                    </label>
                    <Input
                      type="number"
                      {...register('taxRate', { valueAsNumber: true })}
                      placeholder="8.5"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount (%) *
                    </label>
                    <Input
                      type="number"
                      {...register('discountPercent', { valueAsNumber: true })}
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid Until *
                    </label>
                    <Input
                      type="date"
                      {...register('validUntil')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Terms and Conditions
                  </label>
                  <Textarea
                    {...register('terms')}
                    placeholder="Payment terms, warranties, and other conditions..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <Textarea
                    {...register('notes')}
                    placeholder="Any additional information for the customer..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quote Summary */}
            {itemFields.length > 0 && (
              <Card>
                <CardContent className="space-y-4">
                  <h3 className="text-lg font-semibold">Quote Summary</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Materials Subtotal:</span>
                      <span>${calculations.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Labor Subtotal:</span>
                      <span>${calculations.laborTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${calculations.totalBeforeDiscount.toFixed(2)}</span>
                    </div>
                    {calculations.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({watchedDiscountPercent}%):</span>
                        <span>-${calculations.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Tax ({watchedTaxRate}%):</span>
                      <span>${calculations.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total:</span>
                        <span>${calculations.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <Button
                type="submit"
                variant="outline"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              
              <Button
                type="button"
                onClick={handleSendQuote}
                disabled={itemFields.length === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Send to Customer
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}