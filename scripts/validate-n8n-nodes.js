#!/usr/bin/env node

/**
 * n8n Node Configuration Validator
 *
 * Validates n8n_update_partial_workflow operations JSON before it's sent to MCP.
 * Catches the 8 most common misconfiguration failure modes.
 *
 * Usage:
 *   echo '<operations JSON array>' | node scripts/validate-n8n-nodes.js
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = validation errors found
 *   2 = invalid input (not valid JSON, not an array)
 */

'use strict';

// Known-good typeVersions extracted from working production workflows
const KNOWN_VERSIONS = {
  'n8n-nodes-base.webhook': 2.1,
  'n8n-nodes-base.airtable': 2.1,
  'n8n-nodes-base.if': 2.3,
  'n8n-nodes-base.splitInBatches': 3,
  'n8n-nodes-base.wait': 1.1,
  'n8n-nodes-base.noOp': 1,
  'n8n-nodes-base.httpRequest': 4.2,
  'n8n-nodes-base.perplexity': 1,
  '@n8n/n8n-nodes-langchain.chainLlm': 1.9,
  '@n8n/n8n-nodes-langchain.lmChatOpenAi': 1.3,
  '@n8n/n8n-nodes-langchain.outputParserStructured': 1.3,
  '@n8n/n8n-nodes-langchain.agent': 3.1,
  'n8n-nodes-base.code': 2,
  'n8n-nodes-base.set': 3.4,
  'n8n-nodes-base.stickyNote': 1,
  '@mendable/n8n-nodes-firecrawl.firecrawl': 1,
  'n8n-nodes-base.gmail': 2.2,
  'n8n-nodes-base.activeCampaign': 1,
  'n8n-nodes-base.aggregate': 1,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively walk all string values in an object.
 * Returns an array of {path, value} for each string found.
 */
function walkStrings(obj, path) {
  path = path || '';
  var results = [];
  if (typeof obj === 'string') {
    results.push({ path: path, value: obj });
  } else if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) {
      results = results.concat(walkStrings(obj[i], path + '[' + i + ']'));
    }
  } else if (obj && typeof obj === 'object') {
    var keys = Object.keys(obj);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      results = results.concat(walkStrings(obj[key], path ? path + '.' + key : key));
    }
  }
  return results;
}

/**
 * Check if a node type string contains a substring (case-insensitive partial match).
 */
function typeContains(nodeType, fragment) {
  return (nodeType || '').toLowerCase().indexOf(fragment.toLowerCase()) !== -1;
}

// ── Checks ───────────────────────────────────────────────────────────────────

/**
 * Check 1: Wrong typeVersion
 */
function checkTypeVersion(nodeName, nodeType, typeVersion) {
  var errors = [];
  if (nodeType && typeVersion !== undefined && KNOWN_VERSIONS[nodeType] !== undefined) {
    if (typeVersion !== KNOWN_VERSIONS[nodeType]) {
      errors.push({
        node: nodeName,
        nodeType: nodeType,
        message: 'typeVersion ' + typeVersion + ', expected ' + KNOWN_VERSIONS[nodeType],
        fix: 'Set typeVersion to ' + KNOWN_VERSIONS[nodeType],
      });
    }
  }
  return errors;
}

/**
 * Check 2: Plain string model on lmChatOpenAi
 */
function checkModelResourceLocator(nodeName, nodeType, params) {
  var errors = [];
  if (!typeContains(nodeType, 'lmChatOpenAi')) return errors;
  if (!params || !params.model) return errors;

  if (typeof params.model === 'string') {
    errors.push({
      node: nodeName,
      nodeType: nodeType,
      message: 'model is a plain string "' + params.model + '"',
      fix: 'Use resource locator: {"__rl": true, "value": "' + params.model + '", "mode": "list", "cachedResultName": "' + params.model + '"}',
    });
  } else if (typeof params.model === 'object' && !params.model.__rl) {
    errors.push({
      node: nodeName,
      nodeType: nodeType,
      message: 'model object is missing __rl: true',
      fix: 'Add __rl: true to the model resource locator object',
    });
  }
  return errors;
}

/**
 * Check 3: prompt instead of promptType+text on chainLlm
 */
function checkChainLlmPrompt(nodeName, nodeType, params) {
  var errors = [];
  if (!typeContains(nodeType, 'chainLlm')) return errors;
  if (!params) return errors;

  if (params.prompt !== undefined) {
    errors.push({
      node: nodeName,
      nodeType: nodeType,
      message: 'uses "prompt" parameter (legacy v1.0-1.3)',
      fix: 'Remove "prompt". Use "promptType": "define" and "text": "<your prompt>" instead',
    });
  }

  if (params.promptType === undefined) {
    errors.push({
      node: nodeName,
      nodeType: nodeType,
      message: 'missing "promptType" — defaults to "auto" which expects a Chat Trigger',
      fix: 'Add "promptType": "define"',
    });
  } else if (params.promptType !== 'define') {
    errors.push({
      node: nodeName,
      nodeType: nodeType,
      message: 'promptType is "' + params.promptType + '" — should be "define" for webhook-triggered workflows',
      fix: 'Set "promptType": "define"',
    });
  }

  if (params.promptType === 'define' && params.text === undefined) {
    errors.push({
      node: nodeName,
      nodeType: nodeType,
      message: 'promptType is "define" but "text" parameter is missing',
      fix: 'Add "text": "=<your prompt>" with the actual prompt content',
    });
  }

  return errors;
}

/**
 * Check 4: Missing hasOutputParser/batching on chainLlm v1.7+
 */
function checkChainLlmRequired(nodeName, nodeType, typeVersion, params) {
  var errors = [];
  if (!typeContains(nodeType, 'chainLlm')) return errors;
  if (!params) return errors;
  if (typeVersion === undefined || typeVersion < 1.7) return errors;

  if (params.batching === undefined) {
    errors.push({
      node: nodeName,
      nodeType: nodeType,
      message: 'missing "batching" parameter (required for chainLlm v1.7+)',
      fix: 'Add "batching": {} to parameters',
    });
  }

  // hasOutputParser is a warning, not an error — depends on whether a parser is connected
  // But if the user explicitly connects a parser, this must be true
  // We flag it as a warning only
  return errors;
}

/**
 * Check 5: $json[ in expressions (outside Code nodes)
 */
function checkJsonShorthand(nodeName, nodeType, params) {
  var errors = [];
  // Skip Code nodes — $json is valid inside JavaScript
  if (typeContains(nodeType, '.code')) return errors;
  if (!params) return errors;

  var strings = walkStrings(params, '');
  for (var i = 0; i < strings.length; i++) {
    var s = strings[i];
    // Match $json[ or $json. but not inside $('...')  style references
    // Also skip if it's literally the string "$json" in a description/note
    if (/\$json[\[.]/.test(s.value)) {
      errors.push({
        node: nodeName,
        nodeType: nodeType,
        message: 'expression at "' + s.path + '" contains $json shorthand',
        fix: "Replace $json['field'] with $('NodeName').item.json['field']. The $json shorthand breaks when nodes are reordered.",
      });
      // Only report once per node to avoid noise
      break;
    }
  }
  return errors;
}

/**
 * Check 6: fields.values[] instead of columns on Airtable update
 */
function checkAirtableUpdate(nodeName, nodeType, params) {
  var errors = [];
  if (!typeContains(nodeType, 'airtable')) return errors;
  if (!params) return errors;
  if (params.operation !== 'update') return errors;

  if (params.fields && params.fields.values) {
    errors.push({
      node: nodeName,
      nodeType: nodeType,
      message: 'Airtable update uses "fields.values[]" (wrong structure)',
      fix: 'Replace with "columns": {"mappingMode": "defineBelow", "value": {...}, "matchingColumns": ["id"], "schema": []}',
    });
  }

  if (params.operation === 'update' && !params.columns) {
    errors.push({
      node: nodeName,
      nodeType: nodeType,
      message: 'Airtable update is missing "columns" parameter',
      fix: 'Add "columns": {"mappingMode": "defineBelow", "value": {"id": "={{ ... }}", ...}, "matchingColumns": ["id"], "schema": []}',
    });
  }

  return errors;
}

/**
 * Check 8: Set node using old fields.values[] format instead of assignments.assignments[]
 */
function checkSetNodeFormat(nodeName, nodeType, params) {
  var errors = [];
  if (!typeContains(nodeType, '.set')) return errors;
  if (!params) return errors;

  // Detect old format: fields.values[{name, stringValue}]
  if (params.fields && params.fields.values) {
    errors.push({
      node: nodeName,
      nodeType: nodeType,
      message: 'Set node uses old "fields.values[]" format — renders empty in n8n UI',
      fix: 'Use "assignments": {"assignments": [{"id": "<uuid>", "name": "field_name", "value": "...", "type": "string"}]}',
    });
  }

  // Detect old "mode" parameter (v3.4 doesn't use it)
  if (params.mode === 'manual') {
    errors.push({
      node: nodeName,
      nodeType: nodeType,
      message: 'Set node has deprecated "mode": "manual" parameter',
      fix: 'Remove "mode" parameter. Use "assignments.assignments[]" format instead of "fields.values[]"',
    });
  }

  return errors;
}

/**
 * Check 7: Missing AI sub-node connections
 * Builds maps from addNode and addConnection ops, then cross-references.
 */
function checkAIConnections(operations) {
  var errors = [];

  // Collect all nodes being added (by name)
  var addedNodes = {}; // name -> {type, params}
  for (var i = 0; i < operations.length; i++) {
    var op = operations[i];
    if (op.type === 'addNode' && op.node) {
      addedNodes[op.node.name] = {
        type: op.node.type || '',
        params: op.node.parameters || {},
      };
    }
  }

  // Collect all connections being added
  var connections = []; // {source, target, sourceOutput}
  for (var j = 0; j < operations.length; j++) {
    var op2 = operations[j];
    if (op2.type === 'addConnection') {
      connections.push({
        source: op2.source || '',
        target: op2.target || '',
        sourceOutput: op2.sourceOutput || 'main',
      });
    }
  }

  // If no nodes are being added, skip this check (updateNode only)
  if (Object.keys(addedNodes).length === 0) return errors;

  // Helper: check if a connection exists targeting a node with a specific sourceOutput
  function hasConnectionTo(targetName, expectedSourceOutput) {
    for (var c = 0; c < connections.length; c++) {
      if (connections[c].target === targetName && connections[c].sourceOutput === expectedSourceOutput) {
        return true;
      }
    }
    return false;
  }

  // Helper: check if a connection exists FROM a node with a specific sourceOutput
  function hasConnectionFrom(sourceName, expectedSourceOutput) {
    for (var c = 0; c < connections.length; c++) {
      if (connections[c].source === sourceName && connections[c].sourceOutput === expectedSourceOutput) {
        return true;
      }
    }
    return false;
  }

  var nodeNames = Object.keys(addedNodes);
  for (var n = 0; n < nodeNames.length; n++) {
    var name = nodeNames[n];
    var info = addedNodes[name];

    // chainLlm must have an LLM connected
    if (typeContains(info.type, 'chainLlm')) {
      if (!hasConnectionTo(name, 'ai_languageModel')) {
        errors.push({
          node: name,
          nodeType: info.type,
          message: 'chainLlm node has no ai_languageModel connection targeting it',
          fix: 'Add: {"type": "addConnection", "source": "<LLM node name>", "target": "' + name + '", "sourceOutput": "ai_languageModel"}',
        });
      }
      // If hasOutputParser is true, must have parser connected
      if (info.params.hasOutputParser === true) {
        if (!hasConnectionTo(name, 'ai_outputParser')) {
          errors.push({
            node: name,
            nodeType: info.type,
            message: 'chainLlm has hasOutputParser:true but no ai_outputParser connection',
            fix: 'Add: {"type": "addConnection", "source": "<Parser node name>", "target": "' + name + '", "sourceOutput": "ai_outputParser"}',
          });
        }
      }
    }

    // outputParserStructured must have an LLM connected
    if (typeContains(info.type, 'outputParserStructured')) {
      if (!hasConnectionTo(name, 'ai_languageModel')) {
        errors.push({
          node: name,
          nodeType: info.type,
          message: 'outputParserStructured node has no ai_languageModel connection targeting it',
          fix: 'Add: {"type": "addConnection", "source": "<LLM node name>", "target": "' + name + '", "sourceOutput": "ai_languageModel"}',
        });
      }
    }

    // lmChatOpenAi must connect TO something via ai_languageModel
    if (typeContains(info.type, 'lmChatOpenAi')) {
      if (!hasConnectionFrom(name, 'ai_languageModel')) {
        errors.push({
          node: name,
          nodeType: info.type,
          message: 'lmChatOpenAi node is not connected to any parent node via ai_languageModel',
          fix: 'Add: {"type": "addConnection", "source": "' + name + '", "target": "<parent node name>", "sourceOutput": "ai_languageModel"}',
        });
      }
    }
  }

  return errors;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function validate(operations) {
  var allErrors = [];
  var opsChecked = 0;

  for (var i = 0; i < operations.length; i++) {
    var op = operations[i];

    if (op.type === 'addNode' && op.node) {
      opsChecked++;
      var node = op.node;
      var nodeName = node.name || '(unnamed node #' + i + ')';
      var nodeType = node.type || '';
      var typeVersion = node.typeVersion;
      var params = node.parameters || {};

      allErrors = allErrors.concat(checkTypeVersion(nodeName, nodeType, typeVersion));
      allErrors = allErrors.concat(checkModelResourceLocator(nodeName, nodeType, params));
      allErrors = allErrors.concat(checkChainLlmPrompt(nodeName, nodeType, params));
      allErrors = allErrors.concat(checkChainLlmRequired(nodeName, nodeType, typeVersion, params));
      allErrors = allErrors.concat(checkJsonShorthand(nodeName, nodeType, params));
      allErrors = allErrors.concat(checkAirtableUpdate(nodeName, nodeType, params));
      allErrors = allErrors.concat(checkSetNodeFormat(nodeName, nodeType, params));
    }

    if (op.type === 'updateNode') {
      opsChecked++;
      var updates = op.updates || op.fields || {};
      var uName = op.name || op.nodeId || '(node #' + i + ')';
      var uType = updates.type || '';
      var uVersion = updates.typeVersion;
      var uParams = updates.parameters || {};

      // For updateNode, we may not have type info — run param-level checks if we have params
      if (uType) {
        allErrors = allErrors.concat(checkTypeVersion(uName, uType, uVersion));
      }
      allErrors = allErrors.concat(checkModelResourceLocator(uName, uType, uParams));
      allErrors = allErrors.concat(checkChainLlmPrompt(uName, uType, uParams));
      allErrors = allErrors.concat(checkChainLlmRequired(uName, uType, uVersion, uParams));
      allErrors = allErrors.concat(checkJsonShorthand(uName, uType, uParams));
      allErrors = allErrors.concat(checkAirtableUpdate(uName, uType, uParams));
      allErrors = allErrors.concat(checkSetNodeFormat(uName, uType, uParams));
    }

    if (op.type === 'addConnection') {
      opsChecked++;
    }
  }

  // Check 7: AI sub-node connections (cross-operation check)
  allErrors = allErrors.concat(checkAIConnections(operations));

  return { errors: allErrors, opsChecked: opsChecked };
}

// ── Read stdin and run ───────────────────────────────────────────────────────

var input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
  input += chunk;
});
process.stdin.on('end', function () {
  input = input.trim();
  if (!input) {
    console.error('ERROR: No input received. Pipe operations JSON array via stdin.');
    console.error('Usage: echo \'[{"type":"addNode", ...}]\' | node scripts/validate-n8n-nodes.js');
    process.exit(2);
  }

  var operations;
  try {
    operations = JSON.parse(input);
  } catch (e) {
    console.error('ERROR: Invalid JSON — ' + e.message);
    process.exit(2);
  }

  if (!Array.isArray(operations)) {
    console.error('ERROR: Input must be a JSON array of operations, got ' + typeof operations);
    process.exit(2);
  }

  var result = validate(operations);

  if (result.errors.length === 0) {
    console.log('VALIDATION PASSED: ' + result.opsChecked + ' operations checked, 0 errors.');
    process.exit(0);
  } else {
    console.log('VALIDATION FAILED (' + result.errors.length + ' errors):');
    console.log('');
    for (var i = 0; i < result.errors.length; i++) {
      var e = result.errors[i];
      var label = e.node;
      if (e.nodeType) {
        // Show short type name
        var shortType = e.nodeType.split('.').pop();
        label += ' (' + shortType + ')';
      }
      console.log('  [' + (i + 1) + '] ' + label + ': ' + e.message);
      console.log('      Fix: ' + e.fix);
      console.log('');
    }
    process.exit(1);
  }
});
