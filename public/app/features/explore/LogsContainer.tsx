import React, { PureComponent } from 'react';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';
import { Collapse } from '@grafana/ui';

import {
  AbsoluteTimeRange,
  DataSourceApi,
  Field,
  GraphSeriesXY,
  LogLevel,
  LogRowModel,
  LogsDedupStrategy,
  LogsMetaItem,
  RawTimeRange,
  TimeRange,
  TimeZone,
} from '@grafana/data';

import { ExploreId, ExploreItemState } from 'app/types/explore';
import { StoreState } from 'app/types';

import { changeDedupStrategy, splitOpen, updateTimeRange } from './state/actions';
import { toggleLogLevelAction } from 'app/features/explore/state/actionTypes';
import { deduplicatedRowsSelector } from 'app/features/explore/state/selectors';
import { getTimeZone } from '../profile/state/selectors';
import { LiveLogsWithTheme } from './LiveLogs';
import { Logs } from './Logs';
import { LogsCrossFadeTransition } from './utils/LogsCrossFadeTransition';
import { LiveTailControls } from './useLiveTailControls';
import { getFieldLinksForExplore } from './utils/links';

interface LogsContainerProps {
  datasourceInstance?: DataSourceApi;
  exploreId: ExploreId;
  loading: boolean;

  logsHighlighterExpressions?: string[];
  logRows?: LogRowModel[];
  logsMeta?: LogsMetaItem[];
  logsSeries?: GraphSeriesXY[];
  dedupedRows?: LogRowModel[];
  visibleRange?: AbsoluteTimeRange;

  onClickFilterLabel?: (key: string, value: string) => void;
  onClickFilterOutLabel?: (key: string, value: string) => void;
  onStartScanning: () => void;
  onStopScanning: () => void;
  timeZone: TimeZone;
  scanning?: boolean;
  scanRange?: RawTimeRange;
  toggleLogLevelAction: typeof toggleLogLevelAction;
  changeDedupStrategy: typeof changeDedupStrategy;
  dedupStrategy: LogsDedupStrategy;
  width: number;
  isLive: boolean;
  updateTimeRange: typeof updateTimeRange;
  range: TimeRange;
  syncedTimes: boolean;
  absoluteRange: AbsoluteTimeRange;
  isPaused: boolean;
  splitOpen: typeof splitOpen;
}

export class LogsContainer extends PureComponent<LogsContainerProps> {
  onChangeTime = (absoluteRange: AbsoluteTimeRange) => {
    const { exploreId, updateTimeRange } = this.props;
    updateTimeRange({ exploreId, absoluteRange });
  };

  handleDedupStrategyChange = (dedupStrategy: LogsDedupStrategy) => {
    this.props.changeDedupStrategy(this.props.exploreId, dedupStrategy);
  };

  handleToggleLogLevel = (hiddenLogLevels: LogLevel[]) => {
    const { exploreId } = this.props;
    this.props.toggleLogLevelAction({
      exploreId,
      hiddenLogLevels,
    });
  };

  getLogRowContext = async (row: LogRowModel, options?: any): Promise<any> => {
    const { datasourceInstance } = this.props;

    if (datasourceInstance?.getLogRowContext) {
      return datasourceInstance.getLogRowContext(row, options);
    }

    return [];
  };

  getFieldLinks = (field: Field, rowIndex: number) => {
    return getFieldLinksForExplore(field, rowIndex, this.props.splitOpen, this.props.range);
  };

  render() {
    const {
      loading,
      logsHighlighterExpressions,
      logRows,
      logsMeta,
      logsSeries,
      dedupedRows,
      onClickFilterLabel,
      onClickFilterOutLabel,
      onStartScanning,
      onStopScanning,
      absoluteRange,
      timeZone,
      visibleRange,
      scanning,
      range,
      width,
      isLive,
      exploreId,
    } = this.props;

    return (
      <>
        <LogsCrossFadeTransition visible={isLive}>
          <Collapse label="Logs" loading={false} isOpen>
            <LiveTailControls exploreId={exploreId}>
              {controls => (
                <LiveLogsWithTheme
                  logRows={logRows}
                  timeZone={timeZone}
                  stopLive={controls.stop}
                  isPaused={this.props.isPaused}
                  onPause={controls.pause}
                  onResume={controls.resume}
                />
              )}
            </LiveTailControls>
          </Collapse>
        </LogsCrossFadeTransition>
        <LogsCrossFadeTransition visible={!isLive}>
          <Collapse label="Logs" loading={loading} isOpen>
            <Logs
              dedupStrategy={this.props.dedupStrategy || LogsDedupStrategy.none}
              logRows={logRows}
              logsMeta={logsMeta}
              logsSeries={logsSeries}
              dedupedRows={dedupedRows}
              highlighterExpressions={logsHighlighterExpressions}
              loading={loading}
              onChangeTime={this.onChangeTime}
              onClickFilterLabel={onClickFilterLabel}
              onClickFilterOutLabel={onClickFilterOutLabel}
              onStartScanning={onStartScanning}
              onStopScanning={onStopScanning}
              onDedupStrategyChange={this.handleDedupStrategyChange}
              onToggleLogLevel={this.handleToggleLogLevel}
              absoluteRange={absoluteRange}
              visibleRange={visibleRange}
              timeZone={timeZone}
              scanning={scanning}
              scanRange={range.raw}
              showContextToggle={this.props.datasourceInstance?.showContextToggle}
              width={width}
              getRowContext={this.getLogRowContext}
              getFieldLinks={this.getFieldLinks}
            />
          </Collapse>
        </LogsCrossFadeTransition>
      </>
    );
  }
}

function mapStateToProps(state: StoreState, { exploreId }: { exploreId: string }) {
  const explore = state.explore;
  // @ts-ignore
  const item: ExploreItemState = explore[exploreId];
  const {
    logsHighlighterExpressions,
    logsResult,
    loading,
    scanning,
    datasourceInstance,
    isLive,
    isPaused,
    range,
    absoluteRange,
    dedupStrategy,
  } = item;
  const dedupedRows = deduplicatedRowsSelector(item);
  const timeZone = getTimeZone(state.user);

  return {
    loading,
    logsHighlighterExpressions,
    logRows: logsResult && logsResult.rows,
    logsMeta: logsResult && logsResult.meta,
    logsSeries: logsResult && logsResult.series,
    visibleRange: logsResult && logsResult.visibleRange,
    scanning,
    timeZone,
    dedupStrategy,
    dedupedRows,
    datasourceInstance,
    isLive,
    isPaused,
    range,
    absoluteRange,
  };
}

const mapDispatchToProps = {
  changeDedupStrategy,
  toggleLogLevelAction,
  updateTimeRange,
  splitOpen,
};

export default hot(module)(connect(mapStateToProps, mapDispatchToProps)(LogsContainer));
