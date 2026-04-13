/**
 * Drag & Drop Handler
 * Handles file drops on the drop zone and validates APK files.
 */
(function () {
  'use strict';

  const dropZone = document.getElementById('dropZone');
  const dropText = document.getElementById('dropText');
  const dropIcon = document.getElementById('dropIcon');

  let dragCounter = 0;

  // Prevent default drag behaviors on the entire document
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  // Drag enter - show active state
  dropZone.addEventListener('dragenter', (e) => {
    dragCounter++;
    dropZone.classList.add('drag-active');
  });

  // Drag over - maintain active state
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
  });

  // Drag leave - remove active state
  dropZone.addEventListener('dragleave', (e) => {
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropZone.classList.remove('drag-active');
    }
  });

  // Drop - handle file
  dropZone.addEventListener('drop', (e) => {
    dragCounter = 0;
    dropZone.classList.remove('drag-active');

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const filePath = file.path; // Electron adds .path property

    if (!filePath) {
      rejectDrop('Could not read file path');
      return;
    }

    if (!filePath.toLowerCase().endsWith('.apk')) {
      rejectDrop('Not an APK file!');
      return;
    }

    // Dispatch custom event for the app controller
    window.dispatchEvent(new CustomEvent('apk-dropped', {
      detail: { filePath, fileName: file.name }
    }));
  });

  // Click to browse
  dropZone.addEventListener('click', async () => {
    if (dropZone.classList.contains('processing')) return;

    const filePath = await window.api.selectFile();
    if (filePath) {
      const fileName = filePath.split(/[\\/]/).pop();
      window.dispatchEvent(new CustomEvent('apk-dropped', {
        detail: { filePath, fileName }
      }));
    }
  });

  function rejectDrop(message) {
    dropZone.classList.add('rejected');
    const originalText = dropText.textContent;
    dropText.textContent = message;

    setTimeout(() => {
      dropZone.classList.remove('rejected');
      dropText.textContent = originalText;
    }, 1500);
  }

  // Expose for other modules
  window.DragDrop = {
    setFileLoaded: (fileName) => {
      dropZone.classList.add('file-loaded');
      dropText.textContent = fileName;
      document.querySelector('.drop-subtext').textContent = 'drop another to replace';
    },
    setProcessing: (isProcessing) => {
      if (isProcessing) {
        dropZone.classList.add('processing');
      } else {
        dropZone.classList.remove('processing');
      }
    },
    reset: () => {
      dropZone.classList.remove('file-loaded', 'processing', 'rejected');
      dropText.textContent = 'DROP APK HERE';
      document.querySelector('.drop-subtext').textContent = 'or click to browse';
    }
  };
})();
