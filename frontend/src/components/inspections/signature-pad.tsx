"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Button, Modal } from '@/components/ui';
import { PenTool, RotateCcw, Check, X } from 'lucide-react';

interface SignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  onSignature: (signatureDataUrl: string) => void;
  title?: string;
  customerName?: string;
}

export function SignaturePad({
  isOpen,
  onClose,
  onSignature,
  title = "Customer Signature",
  customerName
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState({ x: 0, y: 0 });
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 200;

    // Set up drawing style
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear canvas with white background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [isOpen]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const touch = e.touches[0];
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (point: { x: number; y: number }) => {
    setIsDrawing(true);
    setLastPoint(point);
    setHasSignature(true);
  };

  const draw = (currentPoint: { x: number; y: number }) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    setLastPoint(currentPoint);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const point = getMousePos(e);
    startDrawing(point);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const point = getMousePos(e);
    draw(point);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    stopDrawing();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const point = getTouchPos(e);
    startDrawing(point);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const point = getTouchPos(e);
    draw(point);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    stopDrawing();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSignature(dataUrl);
    onClose();
  };

  const handleCancel = () => {
    clearSignature();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {title}
          </h2>
          {customerName && (
            <p className="text-sm text-gray-600">
              Customer: {customerName}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Please sign in the box below using your finger or stylus
          </p>
        </div>

        <div className="flex justify-center mb-4">
          <div className="border-2 border-gray-300 rounded-lg bg-white">
            <canvas
              ref={canvasRef}
              className="touch-none cursor-crosshair rounded-lg"
              style={{ width: '400px', height: '200px' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 mb-4">
          Signature Line: ________________________________
        </div>

        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={clearSignature}
            disabled={!hasSignature}
            className="flex items-center"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </Button>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            
            <Button
              type="button"
              onClick={saveSignature}
              disabled={!hasSignature}
            >
              <Check className="h-4 w-4 mr-2" />
              Save Signature
            </Button>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-400 text-center">
          <p>By signing above, I acknowledge that the inspection has been completed</p>
          <p>and I have received a copy of the inspection report.</p>
        </div>
      </div>
    </Modal>
  );
}