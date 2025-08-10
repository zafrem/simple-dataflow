import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import coseBilkent from 'cytoscape-cose-bilkent'
import fcose from 'cytoscape-fcose'

// Register layout extensions
cytoscape.use(dagre)
cytoscape.use(coseBilkent)
cytoscape.use(fcose)

export const createCytoscape = (container, options = {}) => {
  const defaultStyle = [
    {
      selector: 'node',
      style: {
        'background-color': '#d1d5db',
        'border-width': 0,
        'color': '#374151',
        'label': function(ele) {
          return ele.data('name') + '\n' + ele.data('type')
        },
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '10px',
        'font-weight': 'bold',
        'width': 50,
        'height': 50,
        'overlay-opacity': 0,
        'transition-property': 'background-color',
        'transition-duration': '0.3s',
        'text-max-width': '100px',
        'text-wrap': 'wrap'
      }
    },
    {
      selector: 'node[type="DB"]',
      style: {
        'background-color': '#bfdbfe',
        'shape': 'barrel',
        'width': 55,
        'height': 75,
        'background-gradient-direction': 'to-bottom',
        'background-gradient-stop-colors': '#dbeafe #bfdbfe #93c5fd',
        'background-gradient-stop-positions': '0% 50% 100%',
        'label': function(ele) {
          return ele.data('name') + '\n' + ele.data('type')
        },
        'color': '#374151',
        'font-size': '7px',
        'font-weight': 'bold',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-max-width': '50px',
        'text-wrap': 'wrap'
      }
    },
    {
      selector: 'node[type="API"]',
      style: {
        'background-color': '#bbf7d0',
        'shape': 'round-rectangle',
        'width': 65,
        'height': 55,
        'border-radius': '8px',
        'background-gradient-direction': 'to-bottom',
        'background-gradient-stop-colors': '#dcfce7 #bbf7d0 #86efac',
        'background-gradient-stop-positions': '0% 50% 100%',
        'label': function(ele) {
          return ele.data('name') + '\n' + ele.data('type')
        },
        'color': '#374151',
        'font-size': '7px',
        'font-weight': 'bold',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-max-width': '60px',
        'text-wrap': 'wrap'
      }
    },
    {
      selector: 'node[type="APP"]',
      style: {
        'background-color': '#fed7aa',
        'shape': 'round-rectangle',
        'width': 60,
        'height': 60,
        'border-radius': '10px',
        'background-gradient-direction': 'to-bottom',
        'background-gradient-stop-colors': '#fef3c7 #fed7aa #fdba74',
        'background-gradient-stop-positions': '0% 50% 100%',
        'label': function(ele) {
          return ele.data('name') + '\n' + ele.data('type')
        },
        'color': '#374151',
        'font-size': '7px',
        'font-weight': 'bold',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-max-width': '55px',
        'text-wrap': 'wrap'
      }
    },
    {
      selector: 'node[type="STORAGE"]',
      style: {
        'background-color': '#e9d5ff',
        'shape': 'round-rectangle',
        'width': 60,
        'height': 65,
        'background-gradient-direction': 'to-bottom',
        'background-gradient-stop-colors': '#f3e8ff #e9d5ff #d8b4fe',
        'background-gradient-stop-positions': '0% 70% 100%',
        'border-radius': '6px',
        'label': function(ele) {
          return ele.data('name') + '\n' + ele.data('type')
        },
        'color': '#374151',
        'font-size': '8px',
        'font-weight': 'bold',
        'text-max-width': '55px',
        'text-valign': 'center',
        'text-halign': 'center'
      }
    },
    {
      selector: 'node[type="PIPES"]',
      style: {
        'background-color': '#fef3c7',
        'shape': 'round-rectangle',
        'width': 90,
        'height': 35,
        'background-gradient-direction': 'to-right',
        'background-gradient-stop-colors': '#fffbeb #fef3c7 #fde68a',
        'background-gradient-stop-positions': '0% 50% 100%',
        'border-radius': '12px',
        'label': function(ele) {
          return ele.data('name') + '\n' + ele.data('type')
        },
        'color': '#374151',
        'font-size': '8px',
        'font-weight': 'bold',
        'text-max-width': '85px',
        'text-valign': 'center',
        'text-halign': 'center'
      }
    },
    {
      selector: 'node[type="group"]',
      style: {
        'background-color': 'data(color)',
        'background-opacity': 0.15,
        'border-color': 'data(color)',
        'border-opacity': 0.6,
        'shape': 'round-rectangle',
        'width': '160px',
        'height': '100px',
        'font-size': '11px',
        'text-valign': 'center',
        'text-halign': 'center',
        'border-width': '2px',
        'border-style': 'dashed',
        'color': '#000',
        'text-outline-width': 1,
        'text-outline-color': '#fff',
        'text-max-width': '150px',
        'label': function(ele) { 
          return ele.data('name')
        },
        'font-size': '14px',
        'font-weight': 'bold'
      }
    },
    {
      selector: 'node[type="domain"]',
      style: {
        'background-color': 'data(color)',
        'background-opacity': 0.2,
        'border-color': 'data(color)',
        'border-opacity': 0.8,
        'shape': 'round-rectangle',
        'width': '200px',
        'height': '120px',
        'font-size': '14px',
        'font-weight': 'bold',
        'text-valign': 'center',
        'text-halign': 'center',
        'border-width': '3px',
        'border-style': 'solid',
        'color': '#000',
        'text-outline-width': 2,
        'text-outline-color': '#fff',
        'text-max-width': '190px',
        'label': function(ele) { 
          return ele.data('name') + '\n' + 
                 (ele.data('metadata')?.groupCount || 0) + ' groups, ' + 
                 (ele.data('metadata')?.componentCount || 0) + ' components'
        },
        'font-size': '16px',
        'font-weight': 'bold'
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': '#f39c12'
      }
    },
    {
      selector: 'node:hover',
      style: {
        'border-width': 3,
        'border-color': '#ff8c00'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#95a5a6',
        'target-arrow-color': '#95a5a6',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'opacity': 0.7,
        'overlay-opacity': 0,
        'transition-property': 'line-color, target-arrow-color, width',
        'transition-duration': '0.3s'
      }
    },
    {
      selector: 'edge[connectionType="domain"]',
      style: {
        'line-color': '#3498db',
        'target-arrow-color': '#3498db',
        'line-style': 'solid'
      }
    },
    {
      selector: 'edge[connectionType="direct"]',
      style: {
        'line-color': '#e74c3c',
        'target-arrow-color': '#e74c3c',
        'line-style': 'dashed',
        'width': 3
      }
    },
    {
      selector: 'edge[connectionType="group-pipe"]',
      style: {
        'line-color': '#9b59b6',
        'target-arrow-color': '#9b59b6',
        'line-style': 'dotted',
        'width': 4,
        'opacity': 0.8
      }
    },
    {
      selector: 'edge[connectionType="domain-to-domain"]',
      style: {
        'line-color': '#2980b9',
        'target-arrow-color': '#2980b9',
        'line-style': 'solid',
        'width': 5,
        'opacity': 0.9
      }
    },
    {
      selector: 'edge[connectionType="group-to-group"]',
      style: {
        'line-color': '#27ae60',
        'target-arrow-color': '#27ae60',
        'line-style': 'dashed',
        'width': 3,
        'opacity': 0.8
      }
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#f39c12',
        'target-arrow-color': '#f39c12',
        'width': 4,
        'opacity': 1
      }
    },
    {
      selector: 'edge:hover',
      style: {
        'width': 3,
        'opacity': 1
      }
    },
    {
      selector: '.highlighted',
      style: {
        'border-color': '#f39c12',
        'border-width': 4
      }
    },
    {
      selector: '.dimmed',
      style: {
        'opacity': 0.3
      }
    },
    {
      selector: '.filtered-out',
      style: {
        'display': 'none'
      }
    }
  ]

  const cy = cytoscape({
    container,
    style: defaultStyle,
    layout: { name: 'cose' },
    minZoom: 0.1,
    maxZoom: 3,
    wheelSensitivity: 0.2,
    boxSelectionEnabled: true,
    selectionType: 'single',
    ...options
  })

  return cy
}

export const layoutOptions = {
  dagre: {
    name: 'dagre',
    nodeDimensionsIncludeLabels: true,
    rankDir: 'TB',
    animate: true,
    animationDuration: 1000,
    animationEasing: 'ease-out-cubic',
    fit: true,
    padding: 30,
    spacingFactor: 1.2,
    ranker: 'network-simplex'
  },
  
  cose: {
    name: 'cose',
    animate: false,
    fit: true,
    padding: 30,
    nodeRepulsion: 400000,
    nodeOverlap: 10,
    idealEdgeLength: 100,
    edgeElasticity: 100,
    nestingFactor: 5,
    gravity: 80,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0
  },
  
  'cose-bilkent': {
    name: 'cose-bilkent',
    animate: false,
    fit: true,
    padding: 30,
    nodeDimensionsIncludeLabels: true,
    uniformNodeDimensions: false,
    packComponents: true,
    stepSize: 40,
    samplingType: true,
    sampleSize: 25,
    nodeSeparation: 75,
    piTol: 0.0000001
  },
  
  fcose: {
    name: 'fcose',
    animate: false,
    fit: true,
    padding: 30,
    nodeDimensionsIncludeLabels: true,
    uniformNodeDimensions: false,
    packComponents: true,
    stepSize: 40,
    samplingType: true,
    sampleSize: 25,
    nodeSeparation: 75,
    piTol: 0.0000001,
    nodeRepulsion: 4500,
    idealEdgeLength: 50,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    gravity: 0.25,
    numIter: 2500,
    tile: true,
    tilingPaddingVertical: 10,
    tilingPaddingHorizontal: 10
  },
  
  preset: {
    name: 'preset',
    fit: true,
    padding: 30
  },
  
  circle: {
    name: 'circle',
    animate: false,
    fit: true,
    padding: 30,
    boundingBox: undefined,
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: false,
    spacingFactor: undefined,
    radius: undefined,
    startAngle: 3 / 2 * Math.PI,
    sweep: undefined,
    clockwise: true,
    sort: undefined,
    transform: function (node, position) { return position; }
  },
  
  grid: {
    name: 'grid',
    animate: false,
    fit: true,
    padding: 30,
    boundingBox: undefined,
    avoidOverlap: true,
    avoidOverlapPadding: 10,
    nodeDimensionsIncludeLabels: false,
    spacingFactor: undefined,
    condense: false,
    rows: undefined,
    cols: undefined,
    position: function(node) {},
    sort: undefined,
    transform: function (node, position) { return position; }
  },
  
  domainRows: {
    name: 'preset',
    animate: false,
    fit: true,
    padding: 50,
    positions: function(cy) {
      const positions = {}
      const nodes = cy.nodes()
      
      // Group nodes by domain
      const domains = {}
      nodes.forEach(node => {
        const domain = node.data('domain') || 'unknown'
        if (!domains[domain]) {
          domains[domain] = { DB: [], API: [], APP: [], STORAGE: [], PIPES: [] }
        }
        const type = node.data('type')
        if (domains[domain][type]) {
          domains[domain][type].push(node)
        }
      })
      
      const domainKeys = Object.keys(domains)
      const rowHeight = 150
      const colWidth = 200
      const centerX = 400
      
      domainKeys.forEach((domain, domainIndex) => {
        const y = domainIndex * rowHeight
        const domainNodes = domains[domain]
        
        // Position STORAGE components on the far left
        domainNodes.STORAGE.forEach((node, index) => {
          positions[node.id()] = {
            x: centerX - colWidth * 2,
            y: y + (index * 80)
          }
        })
        
        // Position DB components to the left
        domainNodes.DB.forEach((node, index) => {
          positions[node.id()] = {
            x: centerX - colWidth,
            y: y + (index * 80)
          }
        })
        
        // Position PIPES components in the center-left
        domainNodes.PIPES.forEach((node, index) => {
          positions[node.id()] = {
            x: centerX - (colWidth / 2),
            y: y + (index * 80)
          }
        })
        
        // Position API components in center column
        domainNodes.API.forEach((node, index) => {
          positions[node.id()] = {
            x: centerX,
            y: y + (index * 80)
          }
        })
        
        // Position APP components to the right
        domainNodes.APP.forEach((node, index) => {
          positions[node.id()] = {
            x: centerX + colWidth,
            y: y + (index * 80)
          }
        })
      })
      
      return positions
    }
  }
}

export const applyLayout = (cy, layoutName = 'cose', savedPositions = null) => {
  const layoutConfig = layoutOptions[layoutName] || layoutOptions.cose
  
  // Handle preset layout with saved positions
  if (layoutConfig.name === 'preset' && savedPositions) {
    const positions = {}
    
    // Apply saved positions for existing nodes
    cy.nodes().forEach(node => {
      const nodeId = node.id()
      if (savedPositions[nodeId]) {
        positions[nodeId] = savedPositions[nodeId]
      }
    })
    
    // Only use preset if we have some saved positions
    if (Object.keys(positions).length > 0) {
      const layout = cy.layout({
        ...layoutConfig,
        positions: positions
      })
      layout.run()
      return layout
    } else {
      // Fall back to cose layout if no saved positions
      const fallbackLayout = cy.layout(layoutOptions.cose)
      fallbackLayout.run()
      return fallbackLayout
    }
  }
  
  const layoutInstance = cy.layout(layoutConfig)
  layoutInstance.run()
  return layoutInstance
}

export const highlightConnected = (cy, nodeId) => {
  cy.elements().removeClass('highlighted dimmed')
  
  const node = cy.getElementById(nodeId)
  if (!node.length) return
  
  const connectedEdges = node.connectedEdges()
  const connectedNodes = connectedEdges.connectedNodes()
  
  // Highlight the selected node and its connections
  node.addClass('highlighted')
  connectedNodes.addClass('highlighted')
  connectedEdges.addClass('highlighted')
  
  // Dim everything else
  cy.elements().not(node).not(connectedNodes).not(connectedEdges).addClass('dimmed')
}

export const clearHighlight = (cy) => {
  cy.elements().removeClass('highlighted dimmed')
}

export const searchNodes = (cy, searchTerm) => {
  // Removed highlighting to prevent flickering
  
  if (!searchTerm) return []
  
  const term = searchTerm.toLowerCase()
  const matchingNodes = cy.nodes().filter(node => {
    const name = node.data('name')?.toLowerCase() || ''
    const tag = node.data('tag')?.toLowerCase() || ''
    const type = node.data('type')?.toLowerCase() || ''
    const domain = node.data('domain')?.toLowerCase() || ''
    
    return name.includes(term) || tag.includes(term) || type.includes(term) || domain.includes(term)
  })
  
  // Removed highlighting and auto-fit to prevent flickering
  
  return matchingNodes.map(node => ({
    id: node.id(),
    name: node.data('name'),
    tag: node.data('tag'),
    type: node.data('type'),
    domain: node.data('domain')
  }))
}

export const filterGraph = (cy, filters) => {
  cy.elements().removeClass('filtered-out')
  
  if (!filters || Object.keys(filters).length === 0) return
  
  cy.nodes().forEach(node => {
    let shouldShow = true
    
    if (filters.type && filters.type.length > 0) {
      shouldShow = shouldShow && filters.type.includes(node.data('type'))
    }
    
    if (filters.domain && filters.domain.length > 0) {
      shouldShow = shouldShow && filters.domain.includes(node.data('domain'))
    }
    
    if (filters.source && filters.source.length > 0) {
      shouldShow = shouldShow && filters.source.includes(node.data('source'))
    }
    
    if (!shouldShow) {
      node.addClass('filtered-out')
      node.connectedEdges().addClass('filtered-out')
    }
  })
}

export const exportGraph = (cy, format = 'png', options = {}) => {
  const defaultOptions = {
    output: 'blob',
    bg: '#ffffff',
    full: true,
    scale: 2,
    maxWidth: 4000,
    maxHeight: 4000
  }
  
  const exportOptions = { ...defaultOptions, ...options }
  
  switch (format) {
    case 'png':
      return cy.png(exportOptions)
    case 'jpg':
      return cy.jpg(exportOptions)
    case 'svg':
      return cy.svg(exportOptions)
    default:
      return cy.png(exportOptions)
  }
}

export const getGraphStats = (cy) => {
  const nodes = cy.nodes()
  const edges = cy.edges()
  
  const typeStats = {}
  const domainStats = {}
  const sourceStats = {}
  
  nodes.forEach(node => {
    const type = node.data('type')
    const domain = node.data('domain')
    const source = node.data('source')
    
    typeStats[type] = (typeStats[type] || 0) + 1
    if (domain) domainStats[domain] = (domainStats[domain] || 0) + 1
    if (source) sourceStats[source] = (sourceStats[source] || 0) + 1
  })
  
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    typeStats,
    domainStats,
    sourceStats,
    avgDegree: edges.length > 0 ? (edges.length * 2) / nodes.length : 0
  }
}