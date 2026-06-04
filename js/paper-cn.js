/**
 * 中文期刊论文 - 写作向导
 */
(function () {
  'use strict';

  var state = {
    step: 1,
    title: '',
    paperType: '',
    paperTypeName: '',
    includes: [],
    keywords: [],
    wordCount: 8000,
    customWordCount: null,
    files: [],
    refMode: 'custom',
    customRefs: '',
    selectedRefs: [],
    outlineInserts: [],
    agreed: false,
    generatedContent: '',
    charCount: 0,
    fee: 0,
    paid: false,
    sessionEnded: false,
    downloaded: false
  };

  var PRICE_PER_THOUSAND = 7;
  var TYPE_NAMES = {
    research: '研究论文',
    review: '综述论文',
    theoretical: '理论性论文',
    applied: '应用性论文'
  };

  var SAMPLE_ABSTRACTS = {
    research: {
      keywords: '临床研究；数据统计；疗效评价',
      abstract: '本研究旨在探讨……对特定患者群体的影响。采用回顾性队列设计，纳入符合纳入排除标准的病例，运用SPSS进行统计分析。结果显示，主要结局指标组间差异具有统计学意义（P<0.05）。结论认为，该干预措施在目标人群中具有一定的临床应用价值，尚需前瞻性研究进一步验证。'
    },
    review: {
      keywords: '文献综述；研究进展；循证医学',
      abstract: '本文系统梳理了近年来国内外相关领域研究进展，检索PubMed、CNKI等数据库，筛选高质量文献进行归纳分析。从发病机制、诊断方法、治疗策略及预后因素等方面进行综述，并对现有研究的不足与未来研究方向进行展望，为临床实践与科研选题提供参考。'
    },
    theoretical: {
      keywords: '理论框架；研究模型；方法学',
      abstract: '基于已有研究文献，本文构建适用于本领域的理论分析框架，阐述核心概念之间的逻辑关系与作用路径。通过对经典理论与新近实证研究的整合，提出可检验的研究假设，为后续实证研究奠定理论基础，并讨论该理论模型的适用范围与局限性。'
    },
    applied: {
      keywords: '应用研究；解决方案；实践推广',
      abstract: '针对特定临床或管理场景中的实际问题，本文提出一套可操作的解决方案与实施策略。结合现场调研与专家咨询，对方案的可行性、经济性及预期效益进行评估，并通过典型案例说明应用效果，为相关单位改进工作流程、提升服务质量提供借鉴。'
    }
  };

  var historyData = [
    { minutes: 12, title: '2型糖尿病患者血糖控制影响因素分析' },
    { minutes: 35, title: '慢性阻塞性肺疾病急性加重期治疗进展综述' },
    { minutes: 58, title: '基于循证医学的围术期疼痛管理策略研究' },
    { minutes: 120, title: '社区老年人高血压健康管理模式应用评价' }
  ];

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  function showToast(msg, isError) {
    var toast = $('#toastMsg');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast-msg show' + (isError ? ' error' : '');
    setTimeout(function () {
      toast.classList.remove('show');
    }, 3000);
  }

  function parseKeywords(str) {
    if (!str || !str.trim()) return [];
    return str
      .split(/[\s；;]+/)
      .map(function (k) {
        return k.trim();
      })
      .filter(Boolean);
  }

  function updateTitlePreview() {
    var el = $('#sidebarTitlePreview');
    if (el) {
      el.textContent = state.title || '（尚未输入）';
    }
  }

  function updateProgress() {
    $$('.wizard-progress-item').forEach(function (item, i) {
      var stepNum = i + 1;
      item.classList.remove('active', 'done');
      if (stepNum < state.step) item.classList.add('done');
      if (stepNum === state.step) item.classList.add('active');
    });

    $$('.sidebar-step').forEach(function (item, i) {
      item.classList.toggle('active', i + 1 === state.step);
    });

    $$('.wizard-panel').forEach(function (panel, i) {
      panel.classList.toggle('active', i + 1 === state.step);
    });

    var btnPrev = $('#btnPrev');
    var btnNext = $('#btnNext');
    if (btnPrev) btnPrev.style.visibility = state.step === 1 ? 'hidden' : 'visible';
    if (btnNext) {
      if (state.step === 4) {
        if (state.sessionEnded) {
          btnNext.style.display = 'none';
        } else if (state.generatedContent) {
          btnNext.textContent = '前往支付下载';
          btnNext.style.display = 'inline-flex';
        } else {
          btnNext.textContent = '等待生成…';
          btnNext.style.display = 'inline-flex';
        }
      } else {
        btnNext.textContent = '下一步';
        btnNext.style.display = 'inline-flex';
      }
    }

    updateSidebarStep4();
    updateDownloadButtons();
  }

  function updateSidebarStep4() {
    if (state.step !== 4) return;
    $$('.type-sample-card').forEach(function (card) {
      var isSelected = card.dataset.type === state.paperType;
      card.classList.toggle('highlight', isSelected);
      if (isSelected && state.keywords.length) {
        var kwEl = card.querySelector('.keywords');
        if (kwEl) {
          kwEl.innerHTML = '<strong>关键词：</strong>' + state.keywords.join('；');
        }
        var titleNote = card.querySelector('.paper-title-note');
        if (!titleNote) {
          titleNote = document.createElement('p');
          titleNote.className = 'paper-title-note';
          titleNote.style.cssText = 'font-size:0.85rem;color:var(--accent);margin-bottom:10px;';
          card.insertBefore(titleNote, card.querySelector('.keywords'));
        }
        titleNote.textContent = '《' + state.title + '》';
      }
    });
  }

  function validateStep1() {
    if (!checkAgreement()) return false;

    var title = ($('#paperTitle') || {}).value || '';
    title = title.trim();
    var len = title.length;
    var valid = true;
    var msg = [];

    var titleInput = $('#paperTitle');
    var titleHint = $('#titleHint');

    if (len < 5 || len > 50) {
      valid = false;
      msg.push('论文标题需为 5-50 字');
      if (titleInput) titleInput.classList.add('error');
      if (titleHint) {
        titleHint.textContent = '当前 ' + len + ' 字，需 5-50 字';
        titleHint.className = 'field-hint error';
      }
    } else {
      if (titleInput) titleInput.classList.remove('error');
      if (titleHint) {
        titleHint.textContent = '标题长度符合要求';
        titleHint.className = 'field-hint success';
      }
      state.title = title;
    }

    if (!state.paperType) {
      valid = false;
      msg.push('请选择论文类型');
    }

    var kwStr = ($('#keywords') || {}).value || '';
    var kws = parseKeywords(kwStr);
    var kwHint = $('#keywordsHint');
    if (kws.length < 3 || kws.length > 8) {
      valid = false;
      msg.push('关键词需 3-8 个（空格或；分隔）');
      if (kwHint) {
        kwHint.textContent = '当前 ' + kws.length + ' 个，需 3-8 个';
        kwHint.className = 'field-hint error';
      }
      $('#keywords') && $('#keywords').classList.add('error');
    } else {
      state.keywords = kws;
      if (kwHint) {
        kwHint.textContent = '已输入 ' + kws.length + ' 个关键词';
        kwHint.className = 'field-hint success';
      }
      $('#keywords') && $('#keywords').classList.remove('error');
    }

    var wc = state.wordCount;
    if (state.customWordCount !== null) {
      wc = state.customWordCount;
    }
    if (wc < 3000 || wc > 20000) {
      valid = false;
      msg.push('字数需在 3000-20000 字之间');
    } else {
      state.wordCount = wc;
    }

    if (!valid && msg.length) showToast(msg[0], true);
    return valid;
  }

  function checkAgreement() {
    var agreed = $('#agreementCheck');
    if (!agreed || !agreed.checked) {
      showToast('请阅读并同意服务条款后再继续', true);
      return false;
    }
    state.agreed = true;
    return true;
  }

  function validateStep2() {
    if (!checkAgreement()) return false;
    var custom = ($('#customRefs') || {}).value || '';
    if (state.refMode === 'custom' && custom.trim().length < 20) {
      showToast('请输入自定义参考文献（引文格式），至少 20 字', true);
      return false;
    }
    state.customRefs = custom;
    if (state.refMode === 'recommend' && state.selectedRefs.length === 0) {
      showToast('请至少追加一条推荐文献', true);
      return false;
    }
    return true;
  }

  function validateStep3() {
    return checkAgreement();
  }

  function validateStep4() {
    return checkAgreement();
  }

  function goStep(step) {
    if (step < 1 || step > 4) return;
    state.step = step;
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nextStep() {
    if (state.step === 1 && !validateStep1()) return;
    if (state.step === 2 && !validateStep2()) return;
    if (state.step === 3 && !validateStep3()) return;

    if (state.step === 4) {
      if (!validateStep4()) return;
      if (state.sessionEnded) return;
      if (state.generatedContent) {
        scrollToPaymentSection();
        if (!state.paid) openPayModal();
      } else {
        showToast('论文正在生成中，请稍候', true);
      }
      return;
    }

    if (state.step === 3) {
      generateOutline();
    }

    goStep(state.step + 1);

    if (state.step === 4) {
      runGenerateAnimation();
    }
  }

  function prevStep() {
    if (state.step > 1) goStep(state.step - 1);
  }

  function generateOutline() {
    var preview = $('#outlinePreview');
    if (!preview) return;
    var typeName = state.paperTypeName || '研究论文';
    var inserts = state.outlineInserts.length
      ? state.outlineInserts.map(function (t) {
          return '<span class="inserted-block">[' + t + ']</span>';
        }).join('')
      : '';

    preview.innerHTML =
      '<h5>论文题目：' +
      escapeHtml(state.title) +
      '</h5>' +
      '<p>类型：' +
      escapeHtml(typeName) +
      ' | 目标字数：约 ' +
      state.wordCount +
      ' 字</p>' +
      (inserts ? '<p>已插入：' + inserts + '</p>' : '') +
      '<h5>一、摘要</h5><ul><li>研究背景与目的</li><li>方法</li><li>主要结果</li><li>结论</li></ul>' +
      '<h5>二、引言</h5><ul><li>研究背景</li><li>国内外研究现状</li><li>研究意义与创新点</li></ul>' +
      '<h5>三、资料与方法</h5><ul><li>研究对象与纳入标准</li><li>观察指标</li><li>统计学方法</li></ul>' +
      '<h5>四、结果</h5><ul><li>基线特征</li><li>主要结局分析</li><li>亚组分析（如适用）</li></ul>' +
      '<h5>五、讨论</h5><ul><li>主要发现解读</li><li>与既往研究比较</li><li>局限性</li><li>结论与展望</li></ul>' +
      '<h5>参考文献</h5><ul><li>按 GB/T 7714 格式列出</li></ul>';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function runGenerateAnimation() {
    var status = $('#generateStatus');
    var samples = $('#typeSamples');
    if (status) status.style.display = 'block';
    if (samples) samples.style.display = 'none';

    setTimeout(function () {
      if (status) status.style.display = 'none';
      if (samples) samples.style.display = 'grid';
      generateFullDocument();
      showPaymentSection();
      updateSidebarStep4();
      addHistoryRecord();
      showToast('论文《' + state.title + '》生成成功，请完成支付后下载');
    }, 2000);
  }

  function calculateFee(charCount) {
    var units = Math.ceil(charCount / 1000);
    if (units < 1) units = 1;
    return units * PRICE_PER_THOUSAND;
  }

  function buildSectionParagraphs(heading, targetChars, seed) {
    var paragraphs = [];
    var templates = [
      '近年来，随着医学研究的深入发展，' +
        seed +
        '相关领域受到广泛关注。本研究在充分梳理国内外文献的基础上，结合临床实际与流行病学方法，对研究问题进行了系统分析。',
      '在方法学层面，本研究严格遵循科学规范，合理设计研究方案，明确纳入与排除标准，采用适宜的统计分析方法处理数据，以控制偏倚并提高结果的可信度。',
      '研究结果显示，主要观察指标在不同组别间存在差异，经统计学检验具有临床意义。亚组分析进一步揭示了可能影响结局的关键因素，为后续干预提供了依据。',
      '讨论部分结合现有证据对结果进行解读，分析本研究与既往文献的异同，客观阐述研究局限性，并提出未来研究方向与实践建议。'
    ];
    var text = '';
    var i = 0;
    while (text.length < targetChars) {
      var p = templates[i % templates.length];
      if (state.includes.length) {
        p += '文中将结合' + state.includes.join('、') + '等形式呈现分析结果。';
      }
      paragraphs.push(heading ? '' : p);
      text += p;
      i++;
    }
    return { paragraphs: paragraphs, text: text.substring(0, targetChars) };
  }

  function generateFullDocument() {
    var typeName = state.paperTypeName || '研究论文';
    var sample = SAMPLE_ABSTRACTS[state.paperType] || SAMPLE_ABSTRACTS.research;
    var keywordsStr = state.keywords.length ? state.keywords.join('；') : sample.keywords;
    var targetLen = state.wordCount;
    var refs =
      state.refMode === 'custom'
        ? state.customRefs
        : state.selectedRefs.join('\n');

    var bodyTarget = Math.max(targetLen - 800, 2000);
    var body = buildSectionParagraphs(false, bodyTarget, state.title);

    var doc =
      '【题目】' +
      state.title +
      '\n【类型】' +
      typeName +
      '\n\n【摘要】\n' +
      sample.abstract +
      '\n\n【关键词】' +
      keywordsStr +
      '\n\n一、引言\n' +
      body.text.substring(0, Math.floor(bodyTarget * 0.2)) +
      '\n\n二、资料与方法\n' +
      body.text.substring(
        Math.floor(bodyTarget * 0.2),
        Math.floor(bodyTarget * 0.45)
      ) +
      '\n\n三、结果\n' +
      body.text.substring(
        Math.floor(bodyTarget * 0.45),
        Math.floor(bodyTarget * 0.7)
      ) +
      '\n\n四、讨论\n' +
      body.text.substring(Math.floor(bodyTarget * 0.7)) +
      '\n\n参考文献\n' +
      (refs || '[1] 相关领域研究文献待补充。');

    while (doc.length < targetLen) {
      doc +=
        '\n\n【附录】补充说明：本范文由 AI 辅助生成，仅供格式参考。使用者应结合专业判断与学习积累独立撰写学术论文。';
    }

    if (doc.length > targetLen) {
      doc = doc.substring(0, targetLen);
    }

    state.generatedContent = doc;
    state.charCount = doc.length;
    state.fee = calculateFee(state.charCount);
    renderPaperForExport();
  }

  function renderPaperForExport() {
    var el = $('#paperDocRender');
    if (!el || !state.generatedContent) return;

    var html = '';
    state.generatedContent.split(/\n\n+/).forEach(function (block) {
      block = block.trim();
      if (!block) return;

      var tagMatch = block.match(/^【(.+?)】\s*([\s\S]*)$/);
      if (tagMatch) {
        html += '<h2>' + escapeHtml(tagMatch[1]) + '</h2>';
        if (tagMatch[2].trim()) {
          html += '<p>' + escapeHtml(tagMatch[2].trim()) + '</p>';
        }
        return;
      }

      if (/^[一二三四五六七八]、/.test(block)) {
        var lines = block.split('\n');
        html += '<h2>' + escapeHtml(lines[0]) + '</h2>';
        if (lines.length > 1) {
          html += '<p>' + escapeHtml(lines.slice(1).join('\n')) + '</p>';
        }
        return;
      }

      if (block.indexOf('【题目】') === 0) {
        html += '<h1>' + escapeHtml(state.title) + '</h1>';
        return;
      }

      html += '<p>' + escapeHtml(block) + '</p>';
    });

    el.innerHTML = html;
  }

  function updateBillingUI() {
    var titleEl = $('#billingTitle');
    var countEl = $('#billingCharCount');
    var amountEl = $('#billingAmount');
    var payModalAmount = $('#payModalAmount');
    var payModalChars = $('#payModalChars');

    if (titleEl) titleEl.textContent = state.title;
    if (countEl) countEl.textContent = state.charCount.toLocaleString();
    if (amountEl) amountEl.textContent = '¥' + state.fee.toFixed(2);
    if (payModalAmount) payModalAmount.textContent = '¥' + state.fee.toFixed(2);
    if (payModalChars) payModalChars.textContent = state.charCount.toLocaleString();
  }

  function showPaymentSection() {
    var section = $('#paymentDownloadSection');
    if (section) {
      section.style.display = 'block';
      updateBillingUI();
    }
    scrollToPaymentSection();
  }

  function scrollToPaymentSection() {
    var section = $('#paymentDownloadSection');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openPayModal() {
    if (state.sessionEnded) return;
    if (!state.generatedContent) {
      showToast('请等待论文生成完成', true);
      return;
    }
    updateBillingUI();
    var overlay = $('#payModalOverlay');
    if (overlay) {
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closePayModal() {
    var overlay = $('#payModalOverlay');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function confirmPayment() {
    if (state.sessionEnded) return;
    state.paid = true;
    closePayModal();
    updateDownloadButtons();
    var hint = $('#payStatusHint');
    if (hint) {
      hint.textContent = '支付成功！您现在可以下载 Word 或 PDF 文档';
      hint.className = 'pay-hint paid';
    }
    showToast('支付确认成功，请下载文档');
  }

  function updateDownloadButtons() {
    var btnWord = $('#btnDownloadWord');
    var btnPdf = $('#btnDownloadPdf');
    var btnPay = $('#btnOpenPay');
    var enabled = state.paid && !state.sessionEnded;

    if (btnWord) btnWord.disabled = !enabled;
    if (btnPdf) btnPdf.disabled = !enabled;
    if (btnPay) btnPay.disabled = state.sessionEnded || state.paid;
    if (btnPay && state.paid) btnPay.textContent = '已支付';
  }

  function requirePaymentBeforeDownload(callback) {
    if (state.sessionEnded) {
      showToast('本次服务已结束，请开始新一轮', true);
      return;
    }
    if (!state.generatedContent) {
      showToast('文档尚未生成', true);
      return;
    }
    if (!state.paid) {
      showToast('请先完成扫码支付', true);
      openPayModal();
      return;
    }
    callback();
  }

  function downloadWord() {
    requirePaymentBeforeDownload(function () {
      var html =
        '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">' +
        '<head><meta charset="utf-8"><title>' +
        escapeHtml(state.title) +
        '</title></head><body>' +
        $('#paperDocRender').innerHTML +
        '</body></html>';
      var blob = new Blob(['\ufeff', html], {
        type: 'application/msword;charset=utf-8'
      });
      triggerDownload(blob, sanitizeFilename(state.title) + '.doc');
      onDownloadComplete('Word');
    });
  }

  function downloadPdf() {
    requirePaymentBeforeDownload(function () {
      var el = $('#paperDocRender');
      var JsPDF = window.jspdf && window.jspdf.jsPDF;
      if (!el || typeof html2canvas === 'undefined' || !JsPDF) {
        showToast('PDF 组件加载失败，请刷新页面重试', true);
        return;
      }

      showToast('正在生成 PDF，请稍候…');

      html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
        .then(function (canvas) {
          var imgData = canvas.toDataURL('image/jpeg', 0.95);
          var pdf = new JsPDF('p', 'mm', 'a4');
          var pageWidth = pdf.internal.pageSize.getWidth();
          var pageHeight = pdf.internal.pageSize.getHeight();
          var imgWidth = pageWidth;
          var imgHeight = (canvas.height * imgWidth) / canvas.width;
          var heightLeft = imgHeight;
          var position = 0;

          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }

          pdf.save(sanitizeFilename(state.title) + '.pdf');
          onDownloadComplete('PDF');
        })
        .catch(function () {
          showToast('PDF 生成失败，请重试', true);
        });
    });
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function sanitizeFilename(name) {
    return (name || '论文').replace(/[\\/:*?"<>|]/g, '_').substring(0, 80);
  }

  function onDownloadComplete(format) {
    if (state.downloaded) return;
    state.downloaded = true;
    state.sessionEnded = true;

    addHistoryRecordWithPayment(format);

    var ended = $('#sessionEnded');
    if (ended) ended.style.display = 'block';

    var hint = $('#payStatusHint');
    if (hint) {
      hint.textContent = '文档已下载（' + format + '），本次服务已结束';
      hint.className = 'pay-hint paid';
    }

    var main = $('.wizard-main');
    if (main) main.classList.add('session-locked');

    updateDownloadButtons();
    updateProgress();
    showToast('下载完成，本次服务已结束。如需新论文请点击「开始新一轮」');
  }

  function addHistoryRecordWithPayment(format) {
    var list = $('#historyList');
    if (!list) return;
    var item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML =
      '<span class="time">刚刚</span><span class="success-tag">已下载' +
      format +
      '</span> — 论文《' +
      escapeHtml(state.title) +
      '》（' +
      state.charCount.toLocaleString() +
      ' 字，¥' +
      state.fee.toFixed(2) +
      '）';
    list.insertBefore(item, list.firstChild);
  }

  function startNewRound() {
    if (
      !confirm(
        '开始新一轮将清空当前所有填写内容，是否继续？'
      )
    ) {
      return;
    }
    window.location.reload();
  }

  function initPayment() {
    var btnPay = $('#btnOpenPay');
    var btnConfirm = $('#btnConfirmPaid');
    var btnWord = $('#btnDownloadWord');
    var btnPdf = $('#btnDownloadPdf');
    var btnClose = $('#payModalClose');
    var btnNew = $('#btnNewRound');
    var overlay = $('#payModalOverlay');

    if (btnPay) btnPay.addEventListener('click', openPayModal);
    if (btnConfirm) btnConfirm.addEventListener('click', confirmPayment);
    if (btnWord) btnWord.addEventListener('click', downloadWord);
    if (btnPdf) btnPdf.addEventListener('click', downloadPdf);
    if (btnClose) btnClose.addEventListener('click', closePayModal);
    if (btnNew) btnNew.addEventListener('click', startNewRound);

    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closePayModal();
      });
    }
  }

  function addHistoryRecord() {
    var list = $('#historyList');
    if (!list) return;
    var item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML =
      '<span class="time">刚刚</span><span class="success-tag">生成成功</span> — 论文《' +
      escapeHtml(state.title) +
      '》';
    list.insertBefore(item, list.firstChild);
  }

  function initTitleInput() {
    var input = $('#paperTitle');
    var counter = $('#titleCounter');
    var hint = $('#titleHint');

    if (!input) return;

    input.addEventListener('input', function () {
      if (input.value.length > 50) {
        input.value = input.value.slice(0, 50);
      }
      var len = input.value.length;
      if (counter) counter.textContent = len + ' / 50';
      state.title = input.value.trim();
      updateTitlePreview();

      if (len > 50) {
        input.classList.add('error');
        if (hint) {
          hint.textContent = '已超出 50 字上限，请精简标题';
          hint.className = 'field-hint error';
        }
      } else if (len > 0 && len < 5) {
        input.classList.add('error');
        if (hint) {
          hint.textContent = '还需至少 ' + (5 - len) + ' 字';
          hint.className = 'field-hint error';
        }
      } else if (len >= 5 && len <= 50) {
        input.classList.remove('error');
        input.classList.add('success');
        if (hint) {
          hint.textContent = '标题长度符合要求';
          hint.className = 'field-hint success';
        }
      } else {
        input.classList.remove('error', 'success');
        if (hint) {
          hint.textContent = '请输入 5-50 字的论文标题';
          hint.className = 'field-hint';
        }
      }
    });
  }

  function initTypeCards() {
    $$('.paper-type-card').forEach(function (card) {
      card.addEventListener('click', function () {
        $$('.paper-type-card').forEach(function (c) {
          c.classList.remove('selected');
        });
        card.classList.add('selected');
        state.paperType = card.dataset.type;
        state.paperTypeName = TYPE_NAMES[state.paperType] || '';
      });
    });
  }

  function initCheckboxes() {
    $$('.checkbox-item input').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var item = cb.closest('.checkbox-item');
        item.classList.toggle('checked', cb.checked);
        state.includes = $$('.checkbox-item input:checked').map(function (c) {
          return c.value;
        });
      });
    });
  }

  function initKeywords() {
    var input = $('#keywords');
    var hint = $('#keywordsHint');
    if (!input) return;

    input.addEventListener('input', function () {
      var kws = parseKeywords(input.value);
      if (kws.length < 3) {
        input.classList.add('error');
        input.classList.remove('success');
        if (hint) {
          hint.textContent = '当前 ' + kws.length + ' 个，至少还需 ' + (3 - kws.length) + ' 个';
          hint.className = 'field-hint error';
        }
      } else if (kws.length > 8) {
        input.classList.add('error');
        if (hint) {
          hint.textContent = '超出上限，请保留 8 个以内';
          hint.className = 'field-hint error';
        }
      } else {
        input.classList.remove('error');
        input.classList.add('success');
        if (hint) {
          hint.textContent = '已输入 ' + kws.length + ' 个关键词，将在文章中显示';
          hint.className = 'field-hint success';
        }
        state.keywords = kws;
      }
    });
  }

  function initWordCount() {
    $$('.word-count-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.word-count-btn').forEach(function (b) {
          b.classList.remove('selected');
        });
        btn.classList.add('selected');
        state.wordCount = parseInt(btn.dataset.count, 10);
        state.customWordCount = null;
        var custom = $('#customWordCount');
        if (custom) custom.value = '';
        var hint = $('#wordCountHint');
        if (hint) {
          hint.textContent = '已选择 ' + state.wordCount + ' 字';
          hint.className = 'field-hint success';
        }
      });
    });

    var customInput = $('#customWordCount');
    if (customInput) {
      customInput.addEventListener('input', function () {
        $$('.word-count-btn').forEach(function (b) {
          b.classList.remove('selected');
        });
        var val = parseInt(customInput.value, 10);
        var hint = $('#wordCountHint');
        if (isNaN(val)) {
          state.customWordCount = null;
          if (hint) {
            hint.textContent = '自定义字数范围：3000-20000 字';
            hint.className = 'field-hint';
          }
          return;
        }
        state.customWordCount = val;
        state.wordCount = val;
        if (val < 3000 || val > 20000) {
          customInput.classList.add('error');
          if (hint) {
            hint.textContent = '字数需在 3000-20000 之间，当前 ' + val;
            hint.className = 'field-hint error';
          }
        } else {
          customInput.classList.remove('error');
          if (hint) {
            hint.textContent = '自定义字数：' + val + ' 字';
            hint.className = 'field-hint success';
          }
        }
      });
    }

    var defaultBtn = $('.word-count-btn[data-count="8000"]');
    if (defaultBtn) defaultBtn.classList.add('selected');
  }

  function initFileUpload() {
    var zone = $('#uploadZone');
    var input = $('#fileInput');
    var list = $('#fileList');
    if (!zone || !input) return;

    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('dragover');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });

    input.addEventListener('change', function () {
      handleFiles(input.files);
      input.value = '';
    });

    function handleFiles(files) {
      Array.prototype.forEach.call(files, function (file) {
        state.files.push(file);
        renderFileList();
      });
    }

    function renderFileList() {
      if (!list) return;
      list.innerHTML = '';
      state.files.forEach(function (file, idx) {
        var li = document.createElement('li');
        li.innerHTML =
          '<span>' +
          escapeHtml(file.name) +
          ' (' +
          (file.size / 1024).toFixed(1) +
          ' KB)</span><button type="button" class="remove-file" data-idx="' +
          idx +
          '">删除</button>';
        list.appendChild(li);
      });
      list.querySelectorAll('.remove-file').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.files.splice(parseInt(btn.dataset.idx, 10), 1);
          renderFileList();
        });
      });
    }
  }

  function initRefOptions() {
    $$('.ref-option-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.ref-option-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        state.refMode = btn.dataset.mode;
        var customPanel = $('#customRefPanel');
        var recommendPanel = $('#recommendRefPanel');
        if (customPanel) customPanel.style.display = state.refMode === 'custom' ? 'block' : 'none';
        if (recommendPanel) recommendPanel.style.display = state.refMode === 'recommend' ? 'block' : 'none';
      });
    });

    $$('.recommended-item .add-ref').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.recommended-item');
        var text = item.querySelector('.ref-text').textContent;
        if (state.selectedRefs.indexOf(text) === -1) {
          state.selectedRefs.push(text);
          btn.textContent = '已追加';
          btn.disabled = true;
          showToast('已追加文献');
        }
      });
    });
  }

  function initOutlineTools() {
    $$('.outline-tool-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var label = btn.dataset.insert;
        if (state.outlineInserts.indexOf(label) === -1) {
          state.outlineInserts.push(label);
        }
        generateOutline();
        showToast('已在提纲中标记：' + label);
      });
    });
  }

  function initHistory() {
    var list = $('#historyList');
    if (!list) return;
    historyData.forEach(function (h) {
      var item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML =
        '<span class="time">' +
        h.minutes +
        ' 分钟前</span><span class="success-tag">生成成功</span> — 论文《' +
        escapeHtml(h.title) +
        '》';
      list.appendChild(item);
    });
  }

  function initActions() {
    var btnNext = $('#btnNext');
    var btnPrev = $('#btnPrev');
    if (btnNext) btnNext.addEventListener('click', nextStep);
    if (btnPrev) btnPrev.addEventListener('click', prevStep);

    var agreement = $('#agreementCheck');
    if (agreement) {
      agreement.addEventListener('change', function () {
        state.agreed = agreement.checked;
      });
    }
  }

  function renderTypeSamples() {
    Object.keys(SAMPLE_ABSTRACTS).forEach(function (key) {
      var card = $('.type-sample-card[data-type="' + key + '"]');
      if (!card) return;
      var data = SAMPLE_ABSTRACTS[key];
      var kwEl = card.querySelector('.keywords');
      var absEl = card.querySelector('.abstract');
      if (kwEl) kwEl.innerHTML = '<strong>关键词：</strong>' + data.keywords;
      if (absEl) absEl.textContent = data.abstract;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTitleInput();
    initTypeCards();
    initCheckboxes();
    initKeywords();
    initWordCount();
    initFileUpload();
    initRefOptions();
    initOutlineTools();
    initHistory();
    initActions();
    initPayment();
    renderTypeSamples();
    updateProgress();
    updateTitlePreview();
  });
})();
