/**
 * Progress Handler
 * Manages progress bar updates and result display.
 */
(function () {
  'use strict';

  const progressFill = document.getElementById('progressFill');
  const progressPercent = document.getElementById('progressPercent');
  const progressStatus = document.getElementById('progressStatus');
  const resultSection = document.getElementById('resultSection');
  const resultSuccess = document.getElementById('resultSuccess');
  const resultError = document.getElementById('resultError');
  const resultDetail = document.getElementById('resultDetail');
  const resultObb = document.getElementById('resultObb');
  const errorDetail = document.getElementById('errorDetail');

  window.ProgressHandler = {
    update: (data) => {
      const percent = data.percent || 0;
      progressFill.style.width = percent + '%';
      progressPercent.textContent = percent + '%';
      progressStatus.textContent = data.message || '';
    },

    showSuccess: (data) => {
      resultSection.classList.remove('hidden');
      resultSuccess.classList.remove('hidden');
      resultError.classList.add('hidden');

      resultDetail.textContent = `${data.oldPackageName} → ${data.newPackageName}`;

      if (data.obbResult && data.obbResult.found) {
        if (data.obbResult.renamed) {
          resultObb.textContent = 'OBB folder renamed successfully';
          resultObb.style.color = '#00ff41';
        } else {
          resultObb.textContent = 'OBB folder found but rename failed';
          resultObb.style.color = '#ff4444';
        }
      } else {
        resultObb.textContent = 'No OBB folder found';
        resultObb.style.color = '#666';
      }

      window.UIController.showResult();
      window.DragDrop.setProcessing(false);
    },

    showError: (data) => {
      resultSection.classList.remove('hidden');
      resultSuccess.classList.add('hidden');
      resultError.classList.remove('hidden');

      errorDetail.textContent = data.message || 'Unknown error occurred';

      window.UIController.showResult();
      window.DragDrop.setProcessing(false);
    },

    reset: () => {
      progressFill.style.width = '0%';
      progressPercent.textContent = '0%';
      progressStatus.textContent = 'Initializing...';
      resultSection.classList.add('hidden');
      resultSuccess.classList.add('hidden');
      resultError.classList.add('hidden');
    }
  };
})();
