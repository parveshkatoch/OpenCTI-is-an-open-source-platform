/* eslint-disable no-underscore-dangle */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import windowDimensions from 'react-window-dimensions';
import { createPaginationContainer } from 'react-relay';
import graphql from 'babel-plugin-relay/macro';
import {
  compose, filter, pathOr, propOr,
} from 'ramda';
import { withStyles } from '@material-ui/core/styles';
import {
  AutoSizer,
  ColumnSizer,
  InfiniteLoader,
  Grid,
  WindowScroller,
} from 'react-virtualized';
import { SectorCard, SectorCardDummy } from './SectorCard';

const styles = () => ({
  windowScrollerWrapper: {
    marginTop: 5,
    flex: '1 1 auto',
  },
  bottomPad: {
    padding: '0 0 30px 0',
  },
  rightPad: {
    padding: '0 30px 30px 0',
  },
  leftPad: {
    padding: '0 0 30px 30px',
  },
});
const nbCardsPerLine = 4;
// We can't have the exact number of expected lines. InfiniteLoader requirement
const nbDummyRowsInit = 5;
export const nbCardsToLoad = nbCardsPerLine * (nbDummyRowsInit + 1);

class SectorsCards extends Component {
  constructor(props) {
    super(props);
    this._isCellLoaded = this._isCellLoaded.bind(this);
    this._loadMore = this._loadMore.bind(this);
    this._onSectionRendered = this._onSectionRendered.bind(this);
    this._cellRenderer = this._cellRenderer.bind(this);
    this._setRef = this._setRef.bind(this);
    this.state = {
      scrollToIndex: -1,
      showHeaderText: true,
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.searchTerm !== prevProps.searchTerm) {
      this._loadMore();
    }
  }

  numberOfCardsPerLine() {
    if (this.props.width < 576) {
      return 1;
    }
    if (this.props.width < 900) {
      return 2;
    }
    if (this.props.width < 1200) {
      return 3;
    }
    return 4;
  }

  filterList(list) {
    const searchTerm = propOr('', 'searchTerm', this.props);
    const filterByKeyword = n => searchTerm === ''
      || n.node.name.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1
      || n.node.description.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1;
    if (searchTerm.length > 0) {
      return filter(filterByKeyword, list);
    }
    return list;
  }

  _setRef(windowScroller) {
    // noinspection JSUnusedGlobalSymbols
    this._windowScroller = windowScroller;
  }

  _loadMore() {
    if (!this.props.relay.hasMore() || this.props.relay.isLoading()) {
      return;
    }
    // Fetch the next {nbCardsToLoad} feed items
    this.props.relay.loadMore(nbCardsToLoad, () => {
      // console.log(error);
    });
  }

  _onSectionRendered({
    columnStartIndex,
    columnStopIndex,
    rowStartIndex,
    rowStopIndex,
  }) {
    const startIndex = rowStartIndex * this.numberOfCardsPerLine() + columnStartIndex;
    const stopIndex = rowStopIndex * this.numberOfCardsPerLine() + columnStopIndex;
    this._onRowsRendered({
      startIndex,
      stopIndex,
    });
  }

  _isCellLoaded({ index }) {
    if (this.props.dummy) {
      return true;
    }
    const list = this.filterList(
      pathOr([], ['sectors', 'edges'], this.props.data),
    );
    return !this.props.relay.hasMore() || index < list.length;
  }

  _cellRenderer({
    columnIndex, key, rowIndex, style,
  }) {
    const { classes, dummy, data } = this.props;
    const index = rowIndex * this.numberOfCardsPerLine() + columnIndex;
    let className = classes.bottomPad;
    switch (columnIndex) {
      case 0:
      case 1:
        className = classes.rightPad;
        break;
      case 3:
        className = classes.leftPad;
        break;
      default:
    }
    if (dummy) {
      return (
        <div className={className} key={key} style={style}>
          <SectorCardDummy />
        </div>
      );
    }

    const list = this.filterList(pathOr([], ['sectors', 'edges'], data));
    if (!this._isCellLoaded({ index })) {
      return (
        <div className={className} key={key} style={style}>
          <SectorCardDummy />
        </div>
      );
    }
    const sectorNode = list[index];
    if (!sectorNode) {
      return <div key={key}>&nbsp;</div>;
    }
    const sector = sectorNode.node;
    return (
      <div className={className} key={key} style={style}>
        <SectorCard key={sector.id} sector={sector} />
      </div>
    );
  }

  render() {
    const { classes, dummy, data } = this.props;
    const list = dummy
      ? []
      : this.filterList(pathOr([], ['sectors', 'edges'], data));
    // const globalCount = dummy ? 0 : data.sectors.pageInfo.globalCount;
    // If init screen aka dummy
    let rowCount;
    if (dummy) {
      // If dummy, we load the default number of dummy lines.
      rowCount = nbDummyRowsInit;
    } else {
      // Else we load the lines for the result + dummy if loading in progress
      const nbLineForCards = Math.ceil(
        list.length / this.numberOfCardsPerLine(),
      );
      rowCount = this.props.relay.isLoading()
        ? nbLineForCards + nbDummyRowsInit
        : nbLineForCards;
    }

    const { scrollToIndex } = this.state;
    // console.log(`globalCount: ${rowCount}/${Math.ceil(globalCount / this.numberOfCardsPerLine())}`);

    return (
      <WindowScroller ref={this._setRef} scrollElement={window}>
        {({
          height, isScrolling, onChildScroll, scrollTop,
        }) => (
          <div className={classes.windowScrollerWrapper}>
            <InfiniteLoader
              isRowLoaded={this._isCellLoaded}
              loadMoreRows={this._loadMore}
              rowCount={Number.MAX_SAFE_INTEGER}
            >
              {({ onRowsRendered }) => {
                this._onRowsRendered = onRowsRendered;
                return (
                  <AutoSizer disableHeight>
                    {({ width }) => (
                      <ColumnSizer
                        columnMaxWidth={440}
                        columnMinWidth={150}
                        columnCount={this.numberOfCardsPerLine()}
                        width={width}
                      >
                        {({ adjustedWidth, columnWidth }) => (
                          <Grid
                            ref={(el) => {
                              window.listEl = el;
                            }}
                            autoHeight
                            height={height}
                            onRowsRendered={onRowsRendered}
                            isScrolling={isScrolling}
                            onScroll={onChildScroll}
                            columnWidth={columnWidth}
                            columnCount={this.numberOfCardsPerLine()}
                            rowHeight={195}
                            overscanColumnCount={this.numberOfCardsPerLine()}
                            overscanRowCount={2}
                            rowCount={rowCount}
                            cellRenderer={this._cellRenderer}
                            onSectionRendered={this._onSectionRendered}
                            scrollToIndex={scrollToIndex}
                            scrollTop={scrollTop}
                            width={adjustedWidth}
                          />
                        )}
                      </ColumnSizer>
                    )}
                  </AutoSizer>
                );
              }}
            </InfiniteLoader>
          </div>
        )}
      </WindowScroller>
    );
  }
}

SectorsCards.propTypes = {
  classes: PropTypes.object,
  data: PropTypes.object,
  relay: PropTypes.object,
  sectors: PropTypes.object,
  dummy: PropTypes.bool,
  searchTerm: PropTypes.string,
  width: PropTypes.number,
};

export const sectorsCardsQuery = graphql`
  query SectorsCardsPaginationQuery(
    $count: Int!
    $cursor: ID
    $orderBy: SectorsOrdering
    $orderMode: OrderingMode
  ) {
    ...SectorsCards_data
      @arguments(
        count: $count
        cursor: $cursor
        orderBy: $orderBy
        orderMode: $orderMode
      )
  }
`;

const sectorsCards = createPaginationContainer(
  SectorsCards,
  {
    data: graphql`
      fragment SectorsCards_data on Query
        @argumentDefinitions(
          count: { type: "Int", defaultValue: 25 }
          cursor: { type: "ID" }
          orderBy: { type: "SectorsOrdering", defaultValue: "name" }
          orderMode: { type: "OrderingMode", defaultValue: "asc" }
        ) {
        sectors(
          first: $count
          after: $cursor
          orderBy: $orderBy
          orderMode: $orderMode
        ) @connection(key: "Pagination_sectors") {
          edges {
            node {
              id
              name
              description
              ...SectorCard_sector
            }
          }
          pageInfo {
            globalCount
          }
        }
      }
    `,
  },
  {
    direction: 'forward',
    getConnectionFromProps(props) {
      return props.data && props.data.sectors;
    },
    getFragmentVariables(prevVars, totalCount) {
      return {
        ...prevVars,
        count: totalCount,
      };
    },
    getVariables(props, { count, cursor }, fragmentVariables) {
      return {
        count,
        cursor,
        orderBy: fragmentVariables.orderBy,
        orderMode: fragmentVariables.orderMode,
      };
    },
    query: sectorsCardsQuery,
  },
);

export default compose(
  windowDimensions(),
  withStyles(styles, { withTheme: true }),
)(sectorsCards);
