import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Slider } from '../components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { getTemplate, createTemplate, updateTemplate, getCompanies, getOutlets } from '../services/api';
import { 
  Type, 
  Table, 
  Image, 
  Square, 
  AlignLeft, 
  Save, 
  Eye, 
  Trash2,
  GripVertical,
  Plus,
  Settings2,
  Move,
  Maximize2,
  Link,
  Calculator,
  FileText,
  Columns,
  Rows,
  PlusCircle,
  MinusCircle,
  Bold,
  Italic,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Copy,
  Clipboard,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  Grid,
  Layers,
  Edit3
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { v4 as uuidv4 } from 'uuid';

// Element types available
const ELEMENT_TYPES = [
  { type: 'heading', icon: Type, label: 'Heading', category: 'text' },
  { type: 'text', icon: AlignLeft, label: 'Text Block', category: 'text' },
  { type: 'dynamic', icon: Square, label: 'Dynamic Field', category: 'dynamic' },
  { type: 'table', icon: Table, label: 'Items Table', category: 'table' },
  { type: 'spreadsheet', icon: Grid, label: 'Spreadsheet', category: 'table' },
  { type: 'formula', icon: Calculator, label: 'Formula Field', category: 'dynamic' },
  { type: 'divider', icon: Square, label: 'Divider', category: 'layout' },
  { type: 'box', icon: Square, label: 'Box/Container', category: 'layout' },
  { type: 'signature', icon: Edit3, label: 'Signature Block', category: 'layout' },
  { type: 'image', icon: Image, label: 'Image/Logo', category: 'media' },
  { type: 'terms', icon: FileText, label: 'Terms & Conditions', category: 'text' },
];

// Dynamic fields available
const DYNAMIC_FIELDS = [
  { key: '{company_name}', label: 'Company Name', category: 'company' },
  { key: '{company_legal_name}', label: 'Company Legal Name', category: 'company' },
  { key: '{company_address}', label: 'Company Address', category: 'company' },
  { key: '{company_gst}', label: 'Company GST', category: 'company' },
  { key: '{company_cin}', label: 'Company CIN', category: 'company' },
  { key: '{company_logo}', label: 'Company Logo', category: 'company' },
  { key: '{outlet_name}', label: 'Outlet Name', category: 'outlet' },
  { key: '{outlet_display_company}', label: 'Outlet Display Company', category: 'outlet' },
  { key: '{outlet_code}', label: 'Outlet Code', category: 'outlet' },
  { key: '{outlet_city}', label: 'Outlet City', category: 'outlet' },
  { key: '{outlet_address}', label: 'Outlet Address', category: 'outlet' },
  { key: '{staff_name}', label: 'Staff Name', category: 'staff' },
  { key: '{staff_code}', label: 'Staff Code', category: 'staff' },
  { key: '{staff_department}', label: 'Staff Department', category: 'staff' },
  { key: '{staff_designation}', label: 'Staff Designation', category: 'staff' },
  { key: '{staff_phone}', label: 'Staff Phone', category: 'staff' },
  { key: '{issue_id}', label: 'Issue ID', category: 'issue' },
  { key: '{issue_date}', label: 'Issue Date', category: 'issue' },
  { key: '{issue_time}', label: 'Issue Time', category: 'issue' },
  { key: '{issuer_name}', label: 'Issuer Name', category: 'issue' },
  { key: '{item_list}', label: 'Items List (Table)', category: 'items' },
  { key: '{total_items}', label: 'Total Items Count', category: 'items' },
  { key: '{total_value}', label: 'Total Value', category: 'items' },
  { key: '{terms_conditions}', label: 'Terms & Conditions', category: 'other' },
  { key: '{current_date}', label: 'Current Date', category: 'other' },
  { key: '{page_number}', label: 'Page Number', category: 'other' },
];

// Formula functions
const FORMULA_FUNCTIONS = [
  { name: 'SUM', syntax: 'SUM(field1, field2, ...)', desc: 'Add values' },
  { name: 'MULTIPLY', syntax: 'MULTIPLY(field1, field2)', desc: 'Multiply values' },
  { name: 'SUBTRACT', syntax: 'SUBTRACT(field1, field2)', desc: 'Subtract values' },
  { name: 'DIVIDE', syntax: 'DIVIDE(field1, field2)', desc: 'Divide values' },
  { name: 'PERCENTAGE', syntax: 'PERCENTAGE(value, percent)', desc: 'Calculate percentage' },
  { name: 'ROUND', syntax: 'ROUND(value, decimals)', desc: 'Round number' },
  { name: 'COUNT', syntax: 'COUNT(table_column)', desc: 'Count items' },
  { name: 'IF', syntax: 'IF(condition, true_val, false_val)', desc: 'Conditional' },
];

const FormBuilder = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingElement, setEditingElement] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState(null);
  const [linkedElements, setLinkedElements] = useState([]);
  const [linkMode, setLinkMode] = useState(false);
  const [linkSource, setLinkSource] = useState(null);

  const [templateData, setTemplateData] = useState({
    template_name: '',
    scope: 'company',
    company_id: user?.company_id || '',
    outlet_id: '',
    page_size: 'A4',
    orientation: 'portrait',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
  });

  const [canvasElements, setCanvasElements] = useState([]);

  // Canvas dimensions based on page size
  const getCanvasDimensions = () => {
    const sizes = {
      A4: { portrait: { width: 595, height: 842 }, landscape: { width: 842, height: 595 } },
      Letter: { portrait: { width: 612, height: 792 }, landscape: { width: 792, height: 612 } },
      Legal: { portrait: { width: 612, height: 1008 }, landscape: { width: 1008, height: 612 } },
    };
    return sizes[templateData.page_size]?.[templateData.orientation] || sizes.A4.portrait;
  };

  const canvasDims = getCanvasDimensions();

  // Save to history for undo/redo
  const saveToHistory = useCallback((elements) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.stringify(elements));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCanvasElements(JSON.parse(history[historyIndex - 1]));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCanvasElements(JSON.parse(history[historyIndex + 1]));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesData, outletsData] = await Promise.all([
          user?.role === 'super_admin' ? getCompanies() : Promise.resolve([]),
          getOutlets()
        ]);
        setCompanies(companiesData);
        setOutlets(outletsData);

        if (templateId) {
          setLoading(true);
          const template = await getTemplate(templateId);
          setTemplateData({
            template_name: template.template_name,
            scope: template.scope,
            company_id: template.company_id || '',
            outlet_id: template.outlet_id || '',
            page_size: template.page_size || 'A4',
            orientation: template.orientation || 'portrait',
            margins: template.margins || { top: 20, right: 20, bottom: 20, left: 20 },
          });
          setCanvasElements(template.canvas_elements || []);
          setLinkedElements(template.linked_elements || []);
          saveToHistory(template.canvas_elements || []);
        }
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [templateId, user]);

  // Create default element
  const createDefaultElement = (type) => {
    const baseElement = {
      id: uuidv4(),
      type,
      x: 50,
      y: 50,
      width: 200,
      height: 40,
      locked: false,
      styles: {
        fontSize: 14,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        color: '#000000',
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: '#000000',
        borderStyle: 'solid',
        padding: 5,
      },
    };

    switch (type) {
      case 'heading':
        return { ...baseElement, content: 'Heading Text', height: 50, styles: { ...baseElement.styles, fontSize: 24, fontWeight: 'bold' } };
      case 'text':
        return { ...baseElement, content: 'Enter your text here...', height: 60 };
      case 'dynamic':
        return { ...baseElement, content: '{company_name}', height: 30, dynamicField: '{company_name}' };
      case 'formula':
        return { ...baseElement, content: '0', formula: '', height: 30, linkedFields: [] };
      case 'table':
        return { 
          ...baseElement, 
          content: 'Items Table',
          width: 500,
          height: 150,
          tableConfig: {
            columns: [
              { id: 'item', name: 'Item', width: 150 },
              { id: 'size', name: 'Size', width: 80 },
              { id: 'qty', name: 'Qty', width: 60 },
              { id: 'rate', name: 'Rate', width: 80 },
              { id: 'amount', name: 'Amount', width: 100 },
            ],
            showHeader: true,
            showBorders: true,
            autoCalculate: true,
          }
        };
      case 'spreadsheet':
        return {
          ...baseElement,
          content: 'Spreadsheet',
          width: 400,
          height: 200,
          spreadsheetData: {
            rows: 5,
            cols: 4,
            cells: {},
            formulas: {},
          }
        };
      case 'divider':
        return { ...baseElement, content: '', width: 500, height: 2, styles: { ...baseElement.styles, borderWidth: 1, borderStyle: 'solid' } };
      case 'box':
        return { ...baseElement, content: '', width: 200, height: 100, styles: { ...baseElement.styles, borderWidth: 1 } };
      case 'signature':
        return { ...baseElement, content: 'Signature', width: 200, height: 80 };
      case 'image':
        return { ...baseElement, content: '', width: 100, height: 100, imageUrl: '' };
      case 'terms':
        return { ...baseElement, content: '{terms_conditions}', width: 500, height: 100 };
      default:
        return baseElement;
    }
  };

  // Add element to canvas
  const handleAddElement = (type) => {
    const newElement = createDefaultElement(type);
    const newElements = [...canvasElements, newElement];
    setCanvasElements(newElements);
    setSelectedElement(newElement.id);
    saveToHistory(newElements);
  };

  // Handle mouse down on element
  const handleElementMouseDown = (e, element) => {
    e.stopPropagation();
    if (element.locked) return;
    
    if (linkMode) {
      if (!linkSource) {
        setLinkSource(element.id);
        toast.info('Now click on target element to link');
      } else {
        // Create link
        const newLink = { source: linkSource, target: element.id };
        setLinkedElements([...linkedElements, newLink]);
        setLinkSource(null);
        setLinkMode(false);
        toast.success('Elements linked');
      }
      return;
    }

    setSelectedElement(element.id);
    setIsDragging(true);
    setDragStart({ x: e.clientX - element.x, y: e.clientY - element.y });
  };

  // Handle mouse move
  const handleCanvasMouseMove = (e) => {
    if (!isDragging || !selectedElement) return;
    
    const element = canvasElements.find(el => el.id === selectedElement);
    if (!element || element.locked) return;

    const newX = Math.max(0, Math.min(canvasDims.width - element.width, e.clientX - dragStart.x));
    const newY = Math.max(0, Math.min(canvasDims.height - element.height, e.clientY - dragStart.y));

    // Snap to grid if enabled
    const snapX = showGrid ? Math.round(newX / 10) * 10 : newX;
    const snapY = showGrid ? Math.round(newY / 10) * 10 : newY;

    setCanvasElements(canvasElements.map(el => 
      el.id === selectedElement ? { ...el, x: snapX, y: snapY } : el
    ));
  };

  // Handle mouse up
  const handleCanvasMouseUp = () => {
    if (isDragging) {
      saveToHistory(canvasElements);
    }
    setIsDragging(false);
    setIsResizing(false);
  };

  // Handle resize
  const handleResize = (e, elementId, direction) => {
    e.stopPropagation();
    const element = canvasElements.find(el => el.id === elementId);
    if (!element || element.locked) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = element.width;
    const startHeight = element.height;
    const startElX = element.x;
    const startElY = element.y;

    const handleMove = (moveE) => {
      const deltaX = moveE.clientX - startX;
      const deltaY = moveE.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startElX;
      let newY = startElY;

      if (direction.includes('e')) newWidth = Math.max(50, startWidth + deltaX);
      if (direction.includes('w')) { newWidth = Math.max(50, startWidth - deltaX); newX = startElX + deltaX; }
      if (direction.includes('s')) newHeight = Math.max(20, startHeight + deltaY);
      if (direction.includes('n')) { newHeight = Math.max(20, startHeight - deltaY); newY = startElY + deltaY; }

      setCanvasElements(prev => prev.map(el => 
        el.id === elementId ? { ...el, width: newWidth, height: newHeight, x: newX, y: newY } : el
      ));
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      saveToHistory(canvasElements);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  // Delete element
  const handleDeleteElement = (elementId) => {
    const newElements = canvasElements.filter(el => el.id !== elementId);
    setCanvasElements(newElements);
    setSelectedElement(null);
    setLinkedElements(linkedElements.filter(l => l.source !== elementId && l.target !== elementId));
    saveToHistory(newElements);
  };

  // Copy element
  const handleCopyElement = () => {
    if (!selectedElement) return;
    const element = canvasElements.find(el => el.id === selectedElement);
    setClipboard(JSON.parse(JSON.stringify(element)));
    toast.success('Element copied');
  };

  // Paste element
  const handlePasteElement = () => {
    if (!clipboard) return;
    const newElement = { ...clipboard, id: uuidv4(), x: clipboard.x + 20, y: clipboard.y + 20 };
    const newElements = [...canvasElements, newElement];
    setCanvasElements(newElements);
    setSelectedElement(newElement.id);
    saveToHistory(newElements);
    toast.success('Element pasted');
  };

  // Toggle element lock
  const handleToggleLock = (elementId) => {
    setCanvasElements(canvasElements.map(el => 
      el.id === elementId ? { ...el, locked: !el.locked } : el
    ));
  };

  // Update element styles
  const updateElementStyle = (elementId, styleProp, value) => {
    setCanvasElements(canvasElements.map(el => 
      el.id === elementId ? { ...el, styles: { ...el.styles, [styleProp]: value } } : el
    ));
  };

  // Update element property
  const updateElement = (elementId, prop, value) => {
    setCanvasElements(canvasElements.map(el => 
      el.id === elementId ? { ...el, [prop]: value } : el
    ));
  };

  // Spreadsheet functions
  const updateSpreadsheetCell = (elementId, row, col, value) => {
    setCanvasElements(canvasElements.map(el => {
      if (el.id === elementId && el.spreadsheetData) {
        const newCells = { ...el.spreadsheetData.cells };
        newCells[`${row}-${col}`] = value;
        return { ...el, spreadsheetData: { ...el.spreadsheetData, cells: newCells } };
      }
      return el;
    }));
  };

  const addSpreadsheetRow = (elementId) => {
    setCanvasElements(canvasElements.map(el => {
      if (el.id === elementId && el.spreadsheetData) {
        return { ...el, spreadsheetData: { ...el.spreadsheetData, rows: el.spreadsheetData.rows + 1 }, height: el.height + 30 };
      }
      return el;
    }));
  };

  const addSpreadsheetCol = (elementId) => {
    setCanvasElements(canvasElements.map(el => {
      if (el.id === elementId && el.spreadsheetData) {
        return { ...el, spreadsheetData: { ...el.spreadsheetData, cols: el.spreadsheetData.cols + 1 }, width: el.width + 80 };
      }
      return el;
    }));
  };

  const removeSpreadsheetRow = (elementId) => {
    setCanvasElements(canvasElements.map(el => {
      if (el.id === elementId && el.spreadsheetData && el.spreadsheetData.rows > 1) {
        return { ...el, spreadsheetData: { ...el.spreadsheetData, rows: el.spreadsheetData.rows - 1 }, height: el.height - 30 };
      }
      return el;
    }));
  };

  const removeSpreadsheetCol = (elementId) => {
    setCanvasElements(canvasElements.map(el => {
      if (el.id === elementId && el.spreadsheetData && el.spreadsheetData.cols > 1) {
        return { ...el, spreadsheetData: { ...el.spreadsheetData, cols: el.spreadsheetData.cols - 1 }, width: el.width - 80 };
      }
      return el;
    }));
  };

  // Table column functions
  const addTableColumn = (elementId) => {
    setCanvasElements(canvasElements.map(el => {
      if (el.id === elementId && el.tableConfig) {
        const newCol = { id: uuidv4(), name: 'New Column', width: 80 };
        return { 
          ...el, 
          tableConfig: { ...el.tableConfig, columns: [...el.tableConfig.columns, newCol] },
          width: el.width + 80
        };
      }
      return el;
    }));
  };

  const removeTableColumn = (elementId, colIndex) => {
    setCanvasElements(canvasElements.map(el => {
      if (el.id === elementId && el.tableConfig && el.tableConfig.columns.length > 1) {
        const newCols = el.tableConfig.columns.filter((_, i) => i !== colIndex);
        return { 
          ...el, 
          tableConfig: { ...el.tableConfig, columns: newCols },
          width: el.width - 80
        };
      }
      return el;
    }));
  };

  const updateTableColumn = (elementId, colIndex, prop, value) => {
    setCanvasElements(canvasElements.map(el => {
      if (el.id === elementId && el.tableConfig) {
        const newCols = [...el.tableConfig.columns];
        newCols[colIndex] = { ...newCols[colIndex], [prop]: value };
        return { ...el, tableConfig: { ...el.tableConfig, columns: newCols } };
      }
      return el;
    }));
  };

  // Save template
  const handleSaveTemplate = async () => {
    if (!templateData.template_name) {
      toast.error('Template name is required');
      return;
    }

    try {
      const data = {
        ...templateData,
        canvas_elements: canvasElements,
        linked_elements: linkedElements,
      };

      if (templateId) {
        await updateTemplate(templateId, data);
        toast.success('Template updated');
      } else {
        await createTemplate(data);
        toast.success('Template created');
      }
      navigate('/templates');
    } catch (error) {
      toast.error(error.message || 'Failed to save');
    }
  };

  // Generate PDF preview
  const handlePreviewPDF = () => {
    const doc = new jsPDF({
      orientation: templateData.orientation,
      unit: 'pt',
      format: templateData.page_size.toLowerCase(),
    });

    const scale = 1;
    
    canvasElements.forEach((element) => {
      const x = element.x * scale;
      const y = element.y * scale;
      const width = element.width * scale;
      const height = element.height * scale;

      switch (element.type) {
        case 'heading':
        case 'text':
          doc.setFontSize(element.styles.fontSize);
          doc.setFont('helvetica', element.styles.fontWeight === 'bold' ? 'bold' : 'normal');
          doc.text(element.content, x, y + element.styles.fontSize);
          break;
        case 'dynamic':
          doc.setFontSize(element.styles.fontSize);
          doc.setFont('helvetica', 'italic');
          doc.text(element.content, x, y + element.styles.fontSize);
          break;
        case 'divider':
          doc.line(x, y, x + width, y);
          break;
        case 'box':
          doc.rect(x, y, width, height);
          break;
        case 'table':
        case 'spreadsheet':
          doc.setFontSize(10);
          doc.text('[Table/Spreadsheet - Auto Generated]', x, y + 15);
          doc.rect(x, y, width, height);
          break;
        case 'signature':
          doc.line(x, y + height - 20, x + width, y + height - 20);
          doc.setFontSize(8);
          doc.text(element.content, x, y + height - 5);
          break;
        default:
          break;
      }
    });

    doc.save('template_preview.pdf');
    toast.success('PDF generated');
  };

  // Render element on canvas
  const renderElement = (element) => {
    const isSelected = selectedElement === element.id;
    const isLinkSource = linkSource === element.id;

    const baseStyle = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      fontSize: element.styles?.fontSize || 14,
      fontWeight: element.styles?.fontWeight || 'normal',
      fontStyle: element.styles?.fontStyle || 'normal',
      textAlign: element.styles?.textAlign || 'left',
      color: element.styles?.color || '#000000',
      backgroundColor: element.styles?.backgroundColor || 'transparent',
      border: `${element.styles?.borderWidth || 0}px ${element.styles?.borderStyle || 'solid'} ${element.styles?.borderColor || '#000'}`,
      padding: element.styles?.padding || 5,
      cursor: element.locked ? 'not-allowed' : 'move',
      userSelect: 'none',
      overflow: 'hidden',
    };

    const selectionStyle = isSelected ? {
      outline: '2px solid #FF4F00',
      outlineOffset: '2px',
    } : {};

    const linkSourceStyle = isLinkSource ? {
      outline: '2px dashed #3B82F6',
    } : {};

    return (
      <div
        key={element.id}
        style={{ ...baseStyle, ...selectionStyle, ...linkSourceStyle }}
        onMouseDown={(e) => handleElementMouseDown(e, element)}
        className="group"
        data-testid={`canvas-element-${element.id}`}
      >
        {/* Element content */}
        {element.type === 'heading' && <div className="font-bold">{element.content}</div>}
        {element.type === 'text' && <div className="whitespace-pre-wrap">{element.content}</div>}
        {element.type === 'dynamic' && (
          <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-sm font-mono">
            {element.content}
          </div>
        )}
        {element.type === 'formula' && (
          <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-mono">
            ={element.formula || '0'} → {element.content}
          </div>
        )}
        {element.type === 'divider' && <hr className="w-full border-t border-gray-400" />}
        {element.type === 'box' && <div className="w-full h-full border border-gray-300" />}
        {element.type === 'signature' && (
          <div className="flex flex-col justify-end h-full">
            <div className="border-t-2 border-dashed border-gray-400 pt-1">
              <span className="text-xs text-gray-500">{element.content}</span>
            </div>
          </div>
        )}
        {element.type === 'image' && (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
            <Image className="w-8 h-8" />
          </div>
        )}
        {element.type === 'terms' && (
          <div className="text-xs text-gray-600 overflow-auto">{element.content}</div>
        )}
        {element.type === 'table' && (
          <div className="w-full h-full bg-gray-50 border">
            <table className="w-full text-xs">
              <thead className="bg-gray-200">
                <tr>
                  {element.tableConfig?.columns.map((col, i) => (
                    <th key={i} className="border px-1 py-0.5" style={{ width: col.width }}>{col.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {element.tableConfig?.columns.map((_, i) => (
                    <td key={i} className="border px-1 py-0.5 text-gray-400">...</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {element.type === 'spreadsheet' && (
          <div className="w-full h-full overflow-auto bg-white">
            <table className="text-xs border-collapse">
              <tbody>
                {Array.from({ length: element.spreadsheetData?.rows || 3 }).map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    {Array.from({ length: element.spreadsheetData?.cols || 3 }).map((_, colIdx) => (
                      <td key={colIdx} className="border border-gray-300 p-0">
                        <input
                          className="w-16 h-6 px-1 text-xs border-none outline-none"
                          value={element.spreadsheetData?.cells?.[`${rowIdx}-${colIdx}`] || ''}
                          onChange={(e) => updateSpreadsheetCell(element.id, rowIdx, colIdx, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Lock indicator */}
        {element.locked && (
          <div className="absolute top-1 right-1 text-gray-400">
            <Lock className="w-3 h-3" />
          </div>
        )}

        {/* Resize handles (only when selected and not locked) */}
        {isSelected && !element.locked && (
          <>
            <div className="absolute -right-1 -bottom-1 w-3 h-3 bg-orange-500 cursor-se-resize" onMouseDown={(e) => handleResize(e, element.id, 'se')} />
            <div className="absolute -left-1 -bottom-1 w-3 h-3 bg-orange-500 cursor-sw-resize" onMouseDown={(e) => handleResize(e, element.id, 'sw')} />
            <div className="absolute -right-1 -top-1 w-3 h-3 bg-orange-500 cursor-ne-resize" onMouseDown={(e) => handleResize(e, element.id, 'ne')} />
            <div className="absolute -left-1 -top-1 w-3 h-3 bg-orange-500 cursor-nw-resize" onMouseDown={(e) => handleResize(e, element.id, 'nw')} />
            <div className="absolute right-1/2 -bottom-1 w-3 h-3 bg-orange-500 cursor-s-resize" onMouseDown={(e) => handleResize(e, element.id, 's')} />
            <div className="absolute right-1/2 -top-1 w-3 h-3 bg-orange-500 cursor-n-resize" onMouseDown={(e) => handleResize(e, element.id, 'n')} />
            <div className="absolute -right-1 top-1/2 w-3 h-3 bg-orange-500 cursor-e-resize" onMouseDown={(e) => handleResize(e, element.id, 'e')} />
            <div className="absolute -left-1 top-1/2 w-3 h-3 bg-orange-500 cursor-w-resize" onMouseDown={(e) => handleResize(e, element.id, 'w')} />
          </>
        )}
      </div>
    );
  };

  // Render linked lines
  const renderLinks = () => {
    return linkedElements.map((link, idx) => {
      const source = canvasElements.find(el => el.id === link.source);
      const target = canvasElements.find(el => el.id === link.target);
      if (!source || !target) return null;

      const x1 = source.x + source.width / 2;
      const y1 = source.y + source.height / 2;
      const x2 = target.x + target.width / 2;
      const y2 = target.y + target.height / 2;

      return (
        <svg key={idx} className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3B82F6" strokeWidth="2" strokeDasharray="5,5" />
        </svg>
      );
    });
  };

  const selectedEl = canvasElements.find(el => el.id === selectedElement);

  if (loading) {
    return (
      <DashboardLayout title="Form Builder">
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={templateId ? 'Edit Template' : 'Create Template'}>
      <div className="flex flex-col gap-4">
        {/* Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-card border rounded-sm">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Template Name"
              value={templateData.template_name}
              onChange={(e) => setTemplateData({ ...templateData, template_name: e.target.value })}
              className="w-64"
              data-testid="template-name-input"
            />
            <Select value={templateData.page_size} onValueChange={(v) => setTemplateData({ ...templateData, page_size: v })}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4</SelectItem>
                <SelectItem value="Letter">Letter</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={templateData.orientation} onValueChange={(v) => setTemplateData({ ...templateData, orientation: v })}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0} title="Undo">
              <Undo className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo">
              <Redo className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="ghost" size="icon" onClick={handleCopyElement} disabled={!selectedElement} title="Copy">
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handlePasteElement} disabled={!clipboard} title="Paste">
              <Clipboard className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant={showGrid ? 'secondary' : 'ghost'} size="icon" onClick={() => setShowGrid(!showGrid)} title="Toggle Grid">
              <Grid className="w-4 h-4" />
            </Button>
            <Button variant={linkMode ? 'secondary' : 'ghost'} size="icon" onClick={() => { setLinkMode(!linkMode); setLinkSource(null); }} title="Link Elements">
              <Link className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(50, zoom - 10))} title="Zoom Out">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm w-12 text-center">{zoom}%</span>
              <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(150, zoom + 10))} title="Zoom In">
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePreviewPDF} data-testid="preview-pdf-btn">
              <Eye className="w-4 h-4 mr-2" />Preview PDF
            </Button>
            <Button onClick={() => setSaveDialogOpen(true)} data-testid="save-template-btn">
              <Save className="w-4 h-4 mr-2" />Save
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-4">
          {/* Left Panel - Elements */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Elements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 max-h-[300px] overflow-y-auto">
                {ELEMENT_TYPES.map((el) => {
                  const Icon = el.icon;
                  return (
                    <Button
                      key={el.type}
                      variant="ghost"
                      className="w-full justify-start text-xs h-8"
                      onClick={() => handleAddElement(el.type)}
                      data-testid={`add-${el.type}`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {el.label}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Dynamic Fields</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[250px] overflow-y-auto">
                <Tabs defaultValue="company">
                  <TabsList className="grid grid-cols-3 h-auto">
                    <TabsTrigger value="company" className="text-xs px-1">Company</TabsTrigger>
                    <TabsTrigger value="staff" className="text-xs px-1">Staff</TabsTrigger>
                    <TabsTrigger value="issue" className="text-xs px-1">Issue</TabsTrigger>
                  </TabsList>
                  {['company', 'outlet', 'staff', 'issue', 'items', 'other'].map(cat => (
                    <TabsContent key={cat} value={cat} className="space-y-1">
                      {DYNAMIC_FIELDS.filter(f => f.category === cat).map((field) => (
                        <button
                          key={field.key}
                          className="w-full text-left text-xs font-mono px-2 py-1 rounded hover:bg-muted transition-colors truncate"
                          onClick={() => {
                            if (selectedElement) {
                              const el = canvasElements.find(e => e.id === selectedElement);
                              if (el && (el.type === 'dynamic' || el.type === 'text')) {
                                updateElement(selectedElement, 'content', field.key);
                                if (el.type === 'dynamic') updateElement(selectedElement, 'dynamicField', field.key);
                              }
                            }
                            navigator.clipboard.writeText(field.key);
                            toast.success('Copied');
                          }}
                          title={field.label}
                        >
                          {field.key}
                        </button>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Center - Canvas */}
          <div className="lg:col-span-3 flex justify-center overflow-auto bg-muted/30 rounded-sm p-4 min-h-[600px]">
            <div
              ref={canvasRef}
              className="relative bg-white shadow-lg"
              style={{
                width: canvasDims.width * (zoom / 100),
                height: canvasDims.height * (zoom / 100),
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                backgroundImage: showGrid ? 'radial-gradient(circle, #ddd 1px, transparent 1px)' : 'none',
                backgroundSize: '10px 10px',
              }}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onClick={() => { if (!isDragging) setSelectedElement(null); }}
            >
              {renderLinks()}
              {canvasElements.map(renderElement)}
            </div>
          </div>

          {/* Right Panel - Properties */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedEl ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium capitalize">{selectedEl.type}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleLock(selectedEl.id)}>
                          {selectedEl.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteElement(selectedEl.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Position */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">X</Label>
                        <Input type="number" value={Math.round(selectedEl.x)} onChange={(e) => updateElement(selectedEl.id, 'x', parseInt(e.target.value))} className="h-7 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Y</Label>
                        <Input type="number" value={Math.round(selectedEl.y)} onChange={(e) => updateElement(selectedEl.id, 'y', parseInt(e.target.value))} className="h-7 text-xs" />
                      </div>
                    </div>

                    {/* Size */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Width</Label>
                        <Input type="number" value={Math.round(selectedEl.width)} onChange={(e) => updateElement(selectedEl.id, 'width', parseInt(e.target.value))} className="h-7 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Height</Label>
                        <Input type="number" value={Math.round(selectedEl.height)} onChange={(e) => updateElement(selectedEl.id, 'height', parseInt(e.target.value))} className="h-7 text-xs" />
                      </div>
                    </div>

                    {/* Content */}
                    {['heading', 'text', 'signature'].includes(selectedEl.type) && (
                      <div>
                        <Label className="text-xs">Content</Label>
                        <Textarea 
                          value={selectedEl.content} 
                          onChange={(e) => updateElement(selectedEl.id, 'content', e.target.value)} 
                          className="text-xs" 
                          rows={2} 
                        />
                      </div>
                    )}

                    {/* Dynamic Field */}
                    {selectedEl.type === 'dynamic' && (
                      <div>
                        <Label className="text-xs">Dynamic Field</Label>
                        <Select value={selectedEl.dynamicField} onValueChange={(v) => { updateElement(selectedEl.id, 'dynamicField', v); updateElement(selectedEl.id, 'content', v); }}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DYNAMIC_FIELDS.map((f) => (
                              <SelectItem key={f.key} value={f.key} className="text-xs">{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Formula */}
                    {selectedEl.type === 'formula' && (
                      <div>
                        <Label className="text-xs">Formula</Label>
                        <Input value={selectedEl.formula} onChange={(e) => updateElement(selectedEl.id, 'formula', e.target.value)} className="h-7 text-xs font-mono" placeholder="SUM(A1, B1)" />
                        <p className="text-xs text-muted-foreground mt-1">Functions: SUM, MULTIPLY, SUBTRACT, DIVIDE</p>
                      </div>
                    )}

                    {/* Text Styles */}
                    {['heading', 'text', 'dynamic'].includes(selectedEl.type) && (
                      <>
                        <div>
                          <Label className="text-xs">Font Size</Label>
                          <Input type="number" value={selectedEl.styles?.fontSize || 14} onChange={(e) => updateElementStyle(selectedEl.id, 'fontSize', parseInt(e.target.value))} className="h-7 text-xs" />
                        </div>
                        <div className="flex gap-1">
                          <Button variant={selectedEl.styles?.fontWeight === 'bold' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateElementStyle(selectedEl.id, 'fontWeight', selectedEl.styles?.fontWeight === 'bold' ? 'normal' : 'bold')}>
                            <Bold className="w-3 h-3" />
                          </Button>
                          <Button variant={selectedEl.styles?.fontStyle === 'italic' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateElementStyle(selectedEl.id, 'fontStyle', selectedEl.styles?.fontStyle === 'italic' ? 'normal' : 'italic')}>
                            <Italic className="w-3 h-3" />
                          </Button>
                          <Button variant={selectedEl.styles?.textAlign === 'left' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateElementStyle(selectedEl.id, 'textAlign', 'left')}>
                            <AlignLeft className="w-3 h-3" />
                          </Button>
                          <Button variant={selectedEl.styles?.textAlign === 'center' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateElementStyle(selectedEl.id, 'textAlign', 'center')}>
                            <AlignCenter className="w-3 h-3" />
                          </Button>
                          <Button variant={selectedEl.styles?.textAlign === 'right' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateElementStyle(selectedEl.id, 'textAlign', 'right')}>
                            <AlignRight className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Text Color</Label>
                            <Input type="color" value={selectedEl.styles?.color || '#000000'} onChange={(e) => updateElementStyle(selectedEl.id, 'color', e.target.value)} className="h-7" />
                          </div>
                          <div>
                            <Label className="text-xs">Background</Label>
                            <Input type="color" value={selectedEl.styles?.backgroundColor || '#ffffff'} onChange={(e) => updateElementStyle(selectedEl.id, 'backgroundColor', e.target.value)} className="h-7" />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Border */}
                    <div>
                      <Label className="text-xs">Border Width</Label>
                      <Input type="number" value={selectedEl.styles?.borderWidth || 0} onChange={(e) => updateElementStyle(selectedEl.id, 'borderWidth', parseInt(e.target.value))} className="h-7 text-xs" />
                    </div>

                    {/* Table Config */}
                    {selectedEl.type === 'table' && selectedEl.tableConfig && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Table Columns</Label>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {selectedEl.tableConfig.columns.map((col, idx) => (
                            <div key={col.id} className="flex items-center gap-1">
                              <Input 
                                value={col.name} 
                                onChange={(e) => updateTableColumn(selectedEl.id, idx, 'name', e.target.value)} 
                                className="h-6 text-xs flex-1" 
                              />
                              <Input 
                                type="number" 
                                value={col.width} 
                                onChange={(e) => updateTableColumn(selectedEl.id, idx, 'width', parseInt(e.target.value))} 
                                className="h-6 text-xs w-16" 
                              />
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTableColumn(selectedEl.id, idx)}>
                                <MinusCircle className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => addTableColumn(selectedEl.id)}>
                          <PlusCircle className="w-3 h-3 mr-1" />Add Column
                        </Button>
                      </div>
                    )}

                    {/* Spreadsheet Config */}
                    {selectedEl.type === 'spreadsheet' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Spreadsheet</Label>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => addSpreadsheetRow(selectedEl.id)}>
                            <Rows className="w-3 h-3 mr-1" />+Row
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => removeSpreadsheetRow(selectedEl.id)}>
                            <Rows className="w-3 h-3 mr-1" />-Row
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => addSpreadsheetCol(selectedEl.id)}>
                            <Columns className="w-3 h-3 mr-1" />+Col
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => removeSpreadsheetCol(selectedEl.id)}>
                            <Columns className="w-3 h-3 mr-1" />-Col
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedEl.spreadsheetData?.rows}×{selectedEl.spreadsheetData?.cols}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Select an element to edit its properties
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Layers Panel */}
            <Card className="mt-4">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Layers ({canvasElements.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-40 overflow-y-auto space-y-1">
                {canvasElements.map((el, idx) => (
                  <div 
                    key={el.id} 
                    className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer ${selectedElement === el.id ? 'bg-primary/10' : 'hover:bg-muted'}`}
                    onClick={() => setSelectedElement(el.id)}
                  >
                    <span className="text-muted-foreground">{idx + 1}</span>
                    <span className="flex-1 truncate capitalize">{el.type}</span>
                    {el.locked && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                value={templateData.template_name}
                onChange={(e) => setTemplateData({ ...templateData, template_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={templateData.scope} onValueChange={(v) => setTemplateData({ ...templateData, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {user?.role === 'super_admin' && <SelectItem value="global">Global</SelectItem>}
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="outlet">Outlet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {templateData.scope === 'company' && user?.role === 'super_admin' && (
              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={templateData.company_id} onValueChange={(v) => setTemplateData({ ...templateData, company_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.company_id} value={c.company_id}>{c.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {templateData.scope === 'outlet' && (
              <div className="space-y-2">
                <Label>Outlet</Label>
                <Select value={templateData.outlet_id} onValueChange={(v) => setTemplateData({ ...templateData, outlet_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => (
                      <SelectItem key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default FormBuilder;
